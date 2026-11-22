import crypto from 'node:crypto';
import {
  GameState,
  Player,
  PlayerGameView,
  GameSettings,
  ChatMessage,
  ChatChannel,
  Role,
  createGameState,
  startGame,
  transitionToNight,
  submitNightAction,
  areNightActionsComplete,
  resolveNightAndTransitionToDawn,
  transitionToDayDiscussion,
  voteSkipDiscussion,
  transitionToVoting,
  submitVote,
  areVotesComplete,
  resolveVotesAndTransitionToResult,
  checkWinCondition,
  getPlayerView,
  resetToLobby,
} from 'mafia-shared';
import { generateRoomCode, generateSessionToken, RateLimiter } from './sanitizer.js';

export interface RoomManagerCallbacks {
  onPhaseChange: (
    room: GameState,
    phaseText: { en: string; ta: string; durationMs: number }
  ) => void;
  onTimerTick: (roomId: string, remainingMs: number) => void;
  onStateUpdate: (room: GameState) => void;
  onChatMessage: (roomId: string, message: ChatMessage) => void;
  onDawnResult: (roomId: string, data: { deadPlayerId: string | null; saved: boolean }) => void;
  onVoteResult: (
    roomId: string,
    data: { eliminatedPlayerId: string | null; role?: Role; tie: boolean }
  ) => void;
  onGameOver: (roomId: string, data: any) => void;
}

export class RoomManager {
  private rooms: Map<string, GameState> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  private sessionToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();
  private playerSockets: Map<string, Set<string>> = new Map(); // playerId -> socketIds
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private roomTickIntervals: Map<string, NodeJS.Timeout> = new Map();
  private chatRateLimiter: RateLimiter = new RateLimiter(6, 4000);
  private callbacks: RoomManagerCallbacks;

  constructor(callbacks: RoomManagerCallbacks) {
    this.callbacks = callbacks;

    // Run room cleanup check every 5 minutes
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  getRoom(roomId: string): GameState | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): GameState | undefined {
    const roomId = this.codeToRoomId.get(code.toUpperCase());
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getSession(sessionToken: string): { roomId: string; playerId: string } | undefined {
    return this.sessionToPlayer.get(sessionToken);
  }

  associateSocket(playerId: string, socketId: string): void {
    let sockets = this.playerSockets.get(playerId);
    if (!sockets) {
      sockets = new Set();
      this.playerSockets.set(playerId, sockets);
    }
    sockets.add(socketId);
  }

  removeSocket(playerId: string, socketId: string): void {
    const sockets = this.playerSockets.get(playerId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.playerSockets.delete(playerId);
      }
    }
  }

  getPlayerSockets(playerId: string): string[] {
    const sockets = this.playerSockets.get(playerId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Creates a new room.
   */
  createRoom(
    nickname: string,
    settings?: Partial<GameSettings>
  ): { room: GameState; player: Player } {
    const roomId = crypto.randomUUID();
    const existingCodes = new Set(this.codeToRoomId.keys());
    const roomCode = generateRoomCode(existingCodes);

    const playerId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const sessionToken = generateSessionToken();

    const hostPlayer = {
      id: playerId,
      nickname,
      sessionToken,
      avatarSeed: nickname,
    };

    const room = createGameState(roomId, roomCode, hostPlayer, settings);
    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);
    this.sessionToPlayer.set(sessionToken, { roomId, playerId });

    return { room, player: room.players[playerId] };
  }

  /**
   * Joins an existing room with code.
   */
  joinRoom(
    code: string,
    nickname: string
  ): { success: boolean; error?: string; room?: GameState; player?: Player } {
    const cleanCode = code.trim().toUpperCase();
    const room = this.getRoomByCode(cleanCode);

    if (!room) {
      return { success: false, error: 'Room not found. Check the 4-letter code.' };
    }

    if (room.phase !== 'LOBBY') {
      return { success: false, error: 'Game is already in progress in this room.' };
    }

    const currentPlayers = Object.values(room.players);
    if (currentPlayers.length >= 12) {
      return { success: false, error: 'Room is already full (maximum 12 players).' };
    }

    // Check unique nickname
    const nameConflict = currentPlayers.some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (nameConflict) {
      return { success: false, error: 'That nickname is already taken in this room.' };
    }

    const playerId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const sessionToken = generateSessionToken();

    const newPlayer: Player = {
      id: playerId,
      nickname,
      sessionToken,
      isHost: false,
      isConnected: true,
      isAlive: true,
      avatarSeed: nickname,
    };

    room.players[playerId] = newPlayer;
    room.lastActiveAt = Date.now();
    this.sessionToPlayer.set(sessionToken, { roomId: room.roomId, playerId });

    return { success: true, room, player: newPlayer };
  }

  /**
   * Reconnects an existing player with their sessionToken.
   */
  reconnect(
    sessionToken: string
  ): { success: boolean; error?: string; room?: GameState; player?: Player } {
    const session = this.sessionToPlayer.get(sessionToken);
    if (!session) {
      return { success: false, error: 'Session expired or not found.' };
    }

    const room = this.rooms.get(session.roomId);
    if (!room) {
      return { success: false, error: 'Room no longer exists.' };
    }

    const player = room.players[session.playerId];
    if (!player) {
      return { success: false, error: 'Player not found in room.' };
    }

    player.isConnected = true;
    room.lastActiveAt = Date.now();

    return { success: true, room, player };
  }

  /**
   * Handles player disconnection.
   */
  handleDisconnect(playerId: string): { room?: GameState; newHostId?: string } {
    for (const room of this.rooms.values()) {
      const player = room.players[playerId];
      if (player) {
        player.isConnected = false;
        room.lastActiveAt = Date.now();

        let newHostId: string | undefined = undefined;

        // If host disconnected in LOBBY or anytime, transfer host to next connected player
        if (player.isHost) {
          const nextHost = Object.values(room.players).find(
            (p) => p.id !== playerId && p.isConnected
          );
          if (nextHost) {
            player.isHost = false;
            nextHost.isHost = true;
            room.hostId = nextHost.id;
            newHostId = nextHost.id;
          }
        }

        return { room, newHostId };
      }
    }
    return {};
  }

  /**
   * Host kicks a player from LOBBY.
   */
  kickPlayer(roomId: string, hostPlayerId: string, targetPlayerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'LOBBY' || room.hostId !== hostPlayerId) {
      return false;
    }
    if (hostPlayerId === targetPlayerId) return false;

    const target = room.players[targetPlayerId];
    if (target) {
      this.sessionToPlayer.delete(target.sessionToken);
      this.chatRateLimiter.remove(targetPlayerId);
      delete room.players[targetPlayerId];
      room.lastActiveAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Host updates game settings.
   */
  updateSettings(roomId: string, hostPlayerId: string, settings: Partial<GameSettings>): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'LOBBY' || room.hostId !== hostPlayerId) {
      return false;
    }
    room.settings = { ...room.settings, ...settings };
    room.lastActiveAt = Date.now();
    return true;
  }

  /**
   * Host starts the game.
   */
  startGame(roomId: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only the host can start' };
    if (room.phase !== 'LOBBY') return { success: false, error: 'Game already started' };

    const playerCount = Object.values(room.players).length;
    if (playerCount < 5 || playerCount > 12) {
      return { success: false, error: `Need 5 to 12 players to start (currently ${playerCount})` };
    }

    try {
      // Transition to ROLE_REVEAL so players have a suspense moment to discover their cards
      const nextState = startGame(room, 'ROLE_REVEAL');
      this.rooms.set(roomId, nextState);
      this.startPhaseTimer(roomId, nextState.settings.roleRevealDurationSec * 1000, () => {
        this.advanceFromRoleReveal(roomId);
      });

      this.callbacks.onPhaseChange(nextState, {
        en: 'Look closely at your secret identity... night approaches.',
        ta: 'உங்கள் ரகசிய பங்கைக் கவனியுங்கள்... இரவு நெருங்குகிறது.',
        durationMs: nextState.settings.roleRevealDurationSec * 1000,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private advanceFromRoleReveal(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'ROLE_REVEAL') return;

    const nextState = transitionToNight(room);
    this.rooms.set(roomId, nextState);

    const durationMs = nextState.settings.nightDurationSec * 1000;
    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromNight(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: 'The village goes to sleep... Evil stirs in the darkness.',
      ta: 'கிராமம் உறங்கச் செல்கிறது... இருளில் தீமை அலைகிறது.',
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  /**
   * Submit Night Action.
   */
  handleNightAction(
    roomId: string,
    actorId: string,
    actionType: 'kill' | 'protect' | 'investigate',
    targetId: string
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'NIGHT') {
      return { success: false, error: 'Not currently night phase' };
    }

    try {
      const nextState = submitNightAction(room, actorId, actionType, targetId);
      this.rooms.set(roomId, nextState);

      // Check if all alive night actors have completed their actions
      if (areNightActionsComplete(nextState)) {
        this.clearTimers(roomId);
        // Small 1.5s delay for tension
        setTimeout(() => {
          this.advanceFromNight(roomId);
        }, 1500);
      } else {
        this.callbacks.onStateUpdate(nextState);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private advanceFromNight(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'NIGHT') return;

    const nextState = resolveNightAndTransitionToDawn(room);
    this.rooms.set(roomId, nextState);

    this.callbacks.onDawnResult(roomId, {
      deadPlayerId: nextState.dawnResult?.victimId || null,
      saved: nextState.dawnResult?.saved || false,
    });

    if (nextState.phase === 'GAME_OVER') {
      this.handleGameOverState(roomId, nextState);
      return;
    }

    const durationMs = nextState.settings.dawnDurationSec * 1000;
    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromDawn(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: nextState.dawnResult?.saved
        ? 'Dawn breaks. The Doctor courageously saved a life tonight!'
        : nextState.dawnResult?.victimId
          ? `Dawn breaks. Someone didn't wake up.`
          : 'Dawn breaks peacefully. Nobody died tonight.',
      ta: nextState.dawnResult?.saved
        ? 'விடியல் பிறந்தது. நேற்றிரவு மருத்துவர் ஒருவரின் உயிரைக் காப்பாற்றினார்!'
        : nextState.dawnResult?.victimId
          ? 'விடியல் பிறந்தது. ஒருவர் சடலமாகக் காணப்பட்டார்.'
          : 'விடியல் பிறந்தது. நேற்றிரவு யாரும் இறக்கவில்லை.',
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  private advanceFromDawn(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DAWN') return;

    const nextState = transitionToDayDiscussion(room);
    this.rooms.set(roomId, nextState);

    const durationMs = nextState.settings.discussionDurationSec * 1000;
    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromDiscussion(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: 'The village gathers to discuss suspicions. Who among you is guilty?',
      ta: 'சந்தேகங்களை விவாதிக்க கிராம மக்கள் கூடுகிறார்கள். உங்களுள் யார் குற்றவாளி?',
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  /**
   * Vote skip discussion.
   */
  handleSkipDiscussion(roomId: string, playerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DAY_DISCUSSION') {
      return { success: false, error: 'Not discussion phase' };
    }

    try {
      const { state: nextState, skipped } = voteSkipDiscussion(room, playerId);
      this.rooms.set(roomId, nextState);

      if (skipped) {
        this.clearTimers(roomId);
        this.advanceToVotingPhase(roomId, nextState);
      } else {
        this.callbacks.onStateUpdate(nextState);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private advanceFromDiscussion(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DAY_DISCUSSION') return;
    const nextState = transitionToVoting(room);
    this.advanceToVotingPhase(roomId, nextState);
  }

  private advanceToVotingPhase(roomId: string, nextState: GameState): void {
    this.rooms.set(roomId, nextState);
    const durationMs = nextState.settings.votingDurationSec * 1000;

    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromVoting(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: 'Time to vote! Choose carefully or vote skip.',
      ta: 'வாக்களிக்கும் நேரம்! கவனமாகத் தேர்ந்தெடுக்கவும் அல்லது தவிர்க்கவும்.',
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  /**
   * Submit Vote.
   */
  handleVote(
    roomId: string,
    voterId: string,
    targetId: string | 'skip'
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'VOTING') {
      return { success: false, error: 'Not voting phase' };
    }

    try {
      const nextState = submitVote(room, voterId, targetId);
      this.rooms.set(roomId, nextState);

      if (areVotesComplete(nextState)) {
        this.clearTimers(roomId);
        // Small 2s suspense pause before drumroll/results
        setTimeout(() => {
          this.advanceFromVoting(roomId);
        }, 1500);
      } else {
        this.callbacks.onStateUpdate(nextState);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private advanceFromVoting(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'VOTING') return;

    const nextState = resolveVotesAndTransitionToResult(room);
    this.rooms.set(roomId, nextState);

    this.callbacks.onVoteResult(roomId, {
      eliminatedPlayerId: nextState.voteResult?.eliminatedId || null,
      role: nextState.voteResult?.role,
      tie: nextState.voteResult?.tie || false,
    });

    if (nextState.phase === 'GAME_OVER') {
      this.handleGameOverState(roomId, nextState);
      return;
    }

    const durationMs = nextState.settings.resultDurationSec * 1000;
    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromResult(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: nextState.voteResult?.tie
        ? 'The village could not decide. Nobody was eliminated.'
        : nextState.voteResult?.eliminatedId
          ? `${nextState.players[nextState.voteResult.eliminatedId]?.nickname} was eliminated!`
          : 'The village decided to skip elimination today.',
      ta: nextState.voteResult?.tie
        ? 'கிராம மக்கள் ஒருமித்த முடிவெடுக்க முடியவில்லை.'
        : nextState.voteResult?.eliminatedId
          ? `${nextState.players[nextState.voteResult.eliminatedId]?.nickname} வெளியேற்றப்பட்டார்!`
          : 'யாரையும் வெளியேற்றாமல் தவிர்க்க முடிவு செய்யப்பட்டது.',
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  private advanceFromResult(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'RESULT') return;

    const nextState = transitionToNight(room);
    this.rooms.set(roomId, nextState);

    const durationMs = nextState.settings.nightDurationSec * 1000;
    this.startPhaseTimer(roomId, durationMs, () => {
      this.advanceFromNight(roomId);
    });

    this.callbacks.onPhaseChange(nextState, {
      en: `Night ${nextState.round} falls upon the village...`,
      ta: `கிராமத்தில் இரவு ${nextState.round} கவிகிறது...`,
      durationMs,
    });
    this.callbacks.onStateUpdate(nextState);
  }

  private handleGameOverState(roomId: string, state: GameState): void {
    this.clearTimers(roomId);
    const roles: Record<string, Role> = {};
    for (const [id, p] of Object.entries(state.players)) {
      if (p.role) roles[id] = p.role;
    }

    this.callbacks.onGameOver(roomId, {
      winner: state.winner,
      roles,
      timeline: state.timeline,
    });
    this.callbacks.onStateUpdate(state);
  }

  /**
   * Play Again / Return to lobby.
   */
  handlePlayAgain(roomId: string, playerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'GAME_OVER') {
      return { success: false, error: 'Can only restart from game over' };
    }

    const resetState = resetToLobby(room);
    this.rooms.set(roomId, resetState);
    this.clearTimers(roomId);

    this.callbacks.onPhaseChange(resetState, {
      en: 'Returned to the lobby. Get ready for a new game!',
      ta: 'காத்திருப்பு அறைக்குத் திரும்பியது. புதிய ஆட்டத்திற்குத் தயாராகுங்கள்!',
      durationMs: 0,
    });
    this.callbacks.onStateUpdate(resetState);

    return { success: true };
  }

  /**
   * Handle Chat Messages with role & channel access validation.
   */
  handleChatMessage(
    roomId: string,
    senderId: string,
    text: string,
    channel: ChatChannel
  ): { success: boolean; error?: string; message?: ChatMessage } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const sender = room.players[senderId];
    if (!sender) return { success: false, error: 'Sender not found' };

    // Rate limit check
    if (this.chatRateLimiter.isRateLimited(senderId)) {
      return { success: false, error: 'You are sending messages too fast.' };
    }

    // Channel validation:
    // 1. Ghost channel: sender must be dead
    if (channel === 'ghost' && sender.isAlive) {
      return { success: false, error: 'Only dead players can speak in ghost realm' };
    }

    // 2. Public channel: sender must be alive
    if (channel === 'public' && !sender.isAlive) {
      return { success: false, error: 'Dead players cannot speak in village square' };
    }

    // 3. Mafia channel: sender must be alive Mafia and phase must be NIGHT (or anytime during match for Mafia)
    if (channel === 'mafia' && (!sender.isAlive || sender.role !== 'MAFIA')) {
      return { success: false, error: 'Only living Mafia can speak in Mafia lair' };
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      senderNickname: sender.nickname,
      text,
      channel,
      timestamp: Date.now(),
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 200) {
      room.chatMessages.shift(); // retain last 200 messages
    }
    room.lastActiveAt = Date.now();

    return { success: true, message };
  }

  /**
   * Starts a phase countdown timer with 1s ticks.
   */
  private startPhaseTimer(roomId: string, durationMs: number, onComplete: () => void): void {
    this.clearTimers(roomId);

    const endTime = Date.now() + durationMs;
    const room = this.rooms.get(roomId);
    if (room) {
      room.phaseEndTime = endTime;
    }

    // Immediately emit starting tick
    this.callbacks.onTimerTick(roomId, durationMs);

    // Tick every 1 second
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      this.callbacks.onTimerTick(roomId, remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      this.clearTimers(roomId);
      onComplete();
    }, durationMs);

    this.roomTickIntervals.set(roomId, interval);
    this.roomTimers.set(roomId, timeout);
  }

  private clearTimers(roomId: string): void {
    const timeout = this.roomTimers.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.roomTimers.delete(roomId);
    }
    const interval = this.roomTickIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.roomTickIntervals.delete(roomId);
    }
  }

  /**
   * Cleans up rooms inactive for 30+ minutes.
   */
  private cleanupInactiveRooms(): void {
    const now = Date.now();
    const INACTIVE_LIMIT = 30 * 60 * 1000;

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActiveAt > INACTIVE_LIMIT) {
        this.clearTimers(roomId);
        this.codeToRoomId.delete(room.roomCode);
        for (const p of Object.values(room.players)) {
          this.sessionToPlayer.delete(p.sessionToken);
          this.chatRateLimiter.remove(p.id);
        }
        this.rooms.delete(roomId);
      }
    }
  }
}
