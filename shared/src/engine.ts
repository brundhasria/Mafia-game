import {
  GameState,
  Player,
  PublicPlayer,
  PlayerGameView,
  GamePhase,
  GameSettings,
  DEFAULT_SETTINGS,
  NightActions,
  DawnResult,
  VoteResult,
  Winner,
  Role,
  ChatMessage,
  TimelineEntry,
  InvestigationResult,
} from './types.js';
import { getRoleDistribution, ROLE_DEFINITIONS } from './roles.js';

export class GameEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameEngineError';
  }
}

/**
 * Shuffles an array using Fisher-Yates algorithm.
 */
export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Creates an initial GameState in LOBBY phase.
 */
export function createGameState(
  roomId: string,
  roomCode: string,
  hostPlayer: { id: string; nickname: string; sessionToken: string; avatarSeed?: string },
  settings: Partial<GameSettings> = {}
): GameState {
  const mergedSettings: GameSettings = { ...DEFAULT_SETTINGS, ...settings };
  const now = Date.now();

  const host: Player = {
    id: hostPlayer.id,
    nickname: hostPlayer.nickname,
    sessionToken: hostPlayer.sessionToken,
    isHost: true,
    isConnected: true,
    isAlive: true,
    avatarSeed: hostPlayer.avatarSeed || hostPlayer.nickname,
  };

  return {
    roomId,
    roomCode,
    phase: 'LOBBY',
    round: 0,
    players: { [host.id]: host },
    hostId: host.id,
    settings: mergedSettings,
    nightActions: { mafiaVotes: {} },
    votes: {},
    skipDiscussionVotes: new Set(),
    dawnResult: null,
    lastInvestigationResults: {},
    voteResult: null,
    winner: null,
    timeline: [],
    chatMessages: [],
    phaseEndTime: 0,
    createdAt: now,
    lastActiveAt: now,
  };
}

/**
 * Assigns roles to players and transitions from LOBBY to ROLE_REVEAL (or directly NIGHT).
 */
export function startGame(
  state: GameState,
  startPhase: 'ROLE_REVEAL' | 'NIGHT' = 'ROLE_REVEAL',
  rng: () => number = Math.random
): GameState {
  if (state.phase !== 'LOBBY') {
    throw new GameEngineError(`Cannot start game from phase ${state.phase}`);
  }

  const playerList = Object.values(state.players);
  if (playerList.length < 5 || playerList.length > 12) {
    throw new GameEngineError(
      `Game requires 5 to 12 players to start (currently ${playerList.length})`
    );
  }

  const roles = getRoleDistribution(playerList.length, state.settings);
  const shuffledRoles = shuffle(roles, rng);

  const updatedPlayers: Record<string, Player> = {};
  playerList.forEach((player, idx) => {
    updatedPlayers[player.id] = {
      ...player,
      isAlive: true,
      role: shuffledRoles[idx],
      doctorSelfProtectUsed: false,
    };
  });

  const now = Date.now();
  const durationSec =
    startPhase === 'ROLE_REVEAL'
      ? state.settings.roleRevealDurationSec
      : state.settings.nightDurationSec;

  const initialTimeline: TimelineEntry = {
    id: `tl_${now}_start`,
    round: 1,
    phase: startPhase,
    title: 'Game Started',
    description: `The game began with ${playerList.length} players. Night falls on the village.`,
    titleTa: 'ஆட்டம் தொடங்கியது',
    descriptionTa: `${playerList.length} வீரர்களுடன் ஆட்டம் தொடங்கியது. கிராமத்தில் இரவு கவிகிறது.`,
    timestamp: now,
  };

  return {
    ...state,
    phase: startPhase,
    round: 1,
    players: updatedPlayers,
    nightActions: { mafiaVotes: {} },
    votes: {},
    skipDiscussionVotes: new Set(),
    dawnResult: null,
    lastInvestigationResults: {},
    voteResult: null,
    winner: null,
    timeline: [initialTimeline],
    phaseEndTime: now + durationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Transitions phase to NIGHT.
 */
export function transitionToNight(state: GameState): GameState {
  const now = Date.now();
  const nextRound = state.phase === 'RESULT' ? state.round + 1 : state.round;

  const timelineEntry: TimelineEntry = {
    id: `tl_${now}_night_${nextRound}`,
    round: nextRound,
    phase: 'NIGHT',
    title: `Night ${nextRound}`,
    description: 'The village goes to sleep. Evil stirs in the darkness.',
    titleTa: `இரவு ${nextRound}`,
    descriptionTa: 'கிராமம் உறங்கச் செல்கிறது. இருளில் தீமை அலைகிறது.',
    timestamp: now,
  };

  return {
    ...state,
    phase: 'NIGHT',
    round: nextRound,
    nightActions: { mafiaVotes: {} },
    votes: {},
    skipDiscussionVotes: new Set(),
    dawnResult: null,
    lastInvestigationResults: {},
    voteResult: null,
    timeline: [...state.timeline, timelineEntry],
    phaseEndTime: now + state.settings.nightDurationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Submit a night action (Mafia kill, Doctor protect, Detective investigate).
 */
export function submitNightAction(
  state: GameState,
  actorId: string,
  actionType: 'kill' | 'protect' | 'investigate',
  targetId: string
): GameState {
  if (state.phase !== 'NIGHT') {
    throw new GameEngineError(`Night actions can only be submitted during NIGHT phase`);
  }

  const actor = state.players[actorId];
  if (!actor || !actor.isAlive) {
    throw new GameEngineError(`Dead or nonexistent player cannot act`);
  }

  const target = state.players[targetId];
  if (!target || !target.isAlive) {
    throw new GameEngineError(`Target player must be alive and exist`);
  }

  const newNightActions: NightActions = {
    mafiaVotes: { ...state.nightActions.mafiaVotes },
    doctorTarget: state.nightActions.doctorTarget,
    detectiveTarget: state.nightActions.detectiveTarget,
  };

  const newPlayers = { ...state.players };
  const newInvestigationResults = { ...state.lastInvestigationResults };

  if (actionType === 'kill') {
    if (actor.role !== 'MAFIA') {
      throw new GameEngineError(`Only Mafia can submit a kill action`);
    }
    newNightActions.mafiaVotes[actorId] = targetId;
  } else if (actionType === 'protect') {
    if (actor.role !== 'DOCTOR') {
      throw new GameEngineError(`Only Doctor can submit a protect action`);
    }
    // Check doctor self protect rule: may protect themselves only once per game
    if (actorId === targetId) {
      if (actor.doctorSelfProtectUsed) {
        throw new GameEngineError(`Doctor cannot protect themselves more than once per game`);
      }
      newPlayers[actorId] = { ...actor, doctorSelfProtectUsed: true };
    }
    newNightActions.doctorTarget = targetId;
  } else if (actionType === 'investigate') {
    if (actor.role !== 'DETECTIVE') {
      throw new GameEngineError(`Only Detective can submit an investigate action`);
    }
    newNightActions.detectiveTarget = targetId;
    newInvestigationResults[actorId] = {
      targetId,
      isMafia: target.role === 'MAFIA',
    };
  }

  return {
    ...state,
    players: newPlayers,
    nightActions: newNightActions,
    lastInvestigationResults: newInvestigationResults,
    lastActiveAt: Date.now(),
  };
}

/**
 * Checks whether all required alive night actors have completed their actions.
 */
export function areNightActionsComplete(state: GameState): boolean {
  if (state.phase !== 'NIGHT') return false;

  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  const aliveMafia = alivePlayers.filter((p) => p.role === 'MAFIA');
  const aliveDoctor = alivePlayers.find((p) => p.role === 'DOCTOR');
  const aliveDetective = alivePlayers.find((p) => p.role === 'DETECTIVE');

  // Check Mafia: all alive mafia should have voted
  for (const m of aliveMafia) {
    if (!state.nightActions.mafiaVotes[m.id]) {
      return false;
    }
  }

  // Check Doctor
  if (aliveDoctor && !state.nightActions.doctorTarget) {
    return false;
  }

  // Check Detective
  if (aliveDetective && !state.nightActions.detectiveTarget) {
    return false;
  }

  return true;
}

/**
 * Resolves night actions and transitions to DAWN.
 */
export function resolveNightAndTransitionToDawn(
  state: GameState,
  rng: () => number = Math.random
): GameState {
  if (state.phase !== 'NIGHT') {
    throw new GameEngineError(`Cannot resolve night from phase ${state.phase}`);
  }

  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  const aliveMafia = alivePlayers.filter((p) => p.role === 'MAFIA');

  // 1. Resolve Mafia target by majority vote among alive Mafia
  const mafiaVotes = state.nightActions.mafiaVotes;
  const targetCounts: Record<string, number> = {};

  for (const m of aliveMafia) {
    const targetId = mafiaVotes[m.id];
    if (targetId && state.players[targetId]?.isAlive) {
      targetCounts[targetId] = (targetCounts[targetId] || 0) + 1;
    }
  }

  let chosenMafiaTarget: string | null = null;
  let maxVotes = 0;
  const topTargets: string[] = [];

  for (const [targetId, count] of Object.entries(targetCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      topTargets.length = 0;
      topTargets.push(targetId);
    } else if (count === maxVotes) {
      topTargets.push(targetId);
    }
  }

  if (topTargets.length === 1) {
    chosenMafiaTarget = topTargets[0];
  } else if (topTargets.length > 1) {
    // Ties broken randomly among top targets
    const pickIndex = Math.floor(rng() * topTargets.length);
    chosenMafiaTarget = topTargets[pickIndex];
  }

  // 2. Resolve Doctor protect
  const doctorTarget = state.nightActions.doctorTarget;
  let victimId: string | null = null;
  let saved = false;

  if (chosenMafiaTarget) {
    if (chosenMafiaTarget === doctorTarget) {
      saved = true;
      victimId = null;
    } else {
      victimId = chosenMafiaTarget;
    }
  }

  // 3. Mark victim as dead if not saved
  const newPlayers = { ...state.players };
  if (victimId && newPlayers[victimId]) {
    newPlayers[victimId] = {
      ...newPlayers[victimId],
      isAlive: false,
    };
  }

  const dawnResult: DawnResult = {
    victimId,
    saved,
  };

  const now = Date.now();
  let desc = 'The sun rises over the quiet village.';
  let descTa = 'அமைதியான கிராமத்தின் மேல் சூரியன் உதிக்கிறது.';

  if (saved) {
    desc = 'Dawn breaks. A sinister attack was thwarted by the Doctor tonight!';
    descTa = 'விடியல் பிறந்தது. நேற்றிரவு மருத்துவர் ஒருவரின் உயிரைக் காப்பாற்றினார்!';
  } else if (victimId) {
    const victim = newPlayers[victimId];
    desc = `Dawn breaks. ${victim?.nickname || 'Someone'} was found dead!`;
    descTa = `விடியல் பிறந்தது. ${victim?.nickname || 'ஒருவர்'} சடலமாகக் கண்டெடுக்கப்பட்டார்!`;
  } else {
    desc = 'Dawn breaks peacefully. Nobody died tonight.';
    descTa = 'விடியல் பிறந்தது. நேற்றிரவு யாரும் இறக்கவில்லை.';
  }

  const timelineEntry: TimelineEntry = {
    id: `tl_${now}_dawn_${state.round}`,
    round: state.round,
    phase: 'DAWN',
    title: `Dawn ${state.round}`,
    description: desc,
    titleTa: `விடியல் ${state.round}`,
    descriptionTa: descTa,
    timestamp: now,
  };

  // Check win conditions immediately
  const winCheck = checkWinCondition({ ...state, players: newPlayers });

  return {
    ...state,
    phase: winCheck ? 'GAME_OVER' : 'DAWN',
    winner: winCheck,
    players: newPlayers,
    dawnResult,
    timeline: [...state.timeline, timelineEntry],
    phaseEndTime: now + state.settings.dawnDurationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Transitions from DAWN to DAY_DISCUSSION.
 */
export function transitionToDayDiscussion(state: GameState): GameState {
  if (state.phase !== 'DAWN') {
    throw new GameEngineError(`Cannot transition to day discussion from ${state.phase}`);
  }

  const now = Date.now();
  const timelineEntry: TimelineEntry = {
    id: `tl_${now}_disc_${state.round}`,
    round: state.round,
    phase: 'DAY_DISCUSSION',
    title: `Day ${state.round} Discussion`,
    description: 'Villagers gather to discuss suspicions and accuse suspects.',
    titleTa: `நாள் ${state.round} விவாதம்`,
    descriptionTa: 'சந்தேகங்களை விவாதிக்கவும் மாஃபியாவை அடையாளம் காணவும் கிராம மக்கள் கூடுகிறார்கள்.',
    timestamp: now,
  };

  return {
    ...state,
    phase: 'DAY_DISCUSSION',
    skipDiscussionVotes: new Set(),
    timeline: [...state.timeline, timelineEntry],
    phaseEndTime: now + state.settings.discussionDurationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Vote to skip day discussion. If a majority of alive players vote skip, transitions to VOTING.
 */
export function voteSkipDiscussion(state: GameState, playerId: string): { state: GameState; skipped: boolean } {
  if (state.phase !== 'DAY_DISCUSSION') {
    throw new GameEngineError(`Can only vote to skip discussion during DAY_DISCUSSION phase`);
  }

  const player = state.players[playerId];
  if (!player || !player.isAlive) {
    throw new GameEngineError(`Only alive players can vote to skip discussion`);
  }

  const newSkipVotes = new Set(state.skipDiscussionVotes);
  newSkipVotes.add(playerId);

  const aliveCount = Object.values(state.players).filter((p) => p.isAlive).length;
  const majorityNeeded = Math.floor(aliveCount / 2) + 1;

  if (newSkipVotes.size >= majorityNeeded) {
    const nextState = transitionToVoting({
      ...state,
      skipDiscussionVotes: newSkipVotes,
    });
    return { state: nextState, skipped: true };
  }

  return {
    state: {
      ...state,
      skipDiscussionVotes: newSkipVotes,
      lastActiveAt: Date.now(),
    },
    skipped: false,
  };
}

/**
 * Transitions from DAY_DISCUSSION to VOTING.
 */
export function transitionToVoting(state: GameState): GameState {
  const now = Date.now();
  const timelineEntry: TimelineEntry = {
    id: `tl_${now}_voting_${state.round}`,
    round: state.round,
    phase: 'VOTING',
    title: `Day ${state.round} Voting`,
    description: 'The village casts their ballots to eliminate a suspect.',
    titleTa: `நாள் ${state.round} வாக்குப்பதிவு`,
    descriptionTa: 'ஒருவரை வெளியேற்ற கிராம மக்கள் தங்கள் வாக்குகளைப் பதிவு செய்கிறார்கள்.',
    timestamp: now,
  };

  return {
    ...state,
    phase: 'VOTING',
    votes: {},
    timeline: [...state.timeline, timelineEntry],
    phaseEndTime: now + state.settings.votingDurationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Cast a vote during the VOTING phase.
 */
export function submitVote(
  state: GameState,
  voterId: string,
  targetId: string | 'skip'
): GameState {
  if (state.phase !== 'VOTING') {
    throw new GameEngineError(`Votes can only be cast during VOTING phase`);
  }

  const voter = state.players[voterId];
  if (!voter || !voter.isAlive) {
    throw new GameEngineError(`Dead or nonexistent player cannot vote`);
  }

  if (targetId !== 'skip') {
    const target = state.players[targetId];
    if (!target || !target.isAlive) {
      throw new GameEngineError(`Can only vote for alive players or 'skip'`);
    }
  }

  const newVotes = { ...state.votes, [voterId]: targetId };

  return {
    ...state,
    votes: newVotes,
    lastActiveAt: Date.now(),
  };
}

/**
 * Checks whether all alive players have cast their votes.
 */
export function areVotesComplete(state: GameState): boolean {
  if (state.phase !== 'VOTING') return false;
  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  return alivePlayers.every((p) => state.votes[p.id] !== undefined);
}

/**
 * Resolves votes and transitions from VOTING to RESULT.
 */
export function resolveVotesAndTransitionToResult(state: GameState): GameState {
  if (state.phase !== 'VOTING') {
    throw new GameEngineError(`Cannot resolve votes from phase ${state.phase}`);
  }

  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  const voteWeights: Record<string, number> = {};

  // Count votes with Mayor weighting (Mayor gets 2 votes if enabled)
  for (const voter of alivePlayers) {
    const target = state.votes[voter.id];
    if (target) {
      const weight = state.settings.enableMayor && voter.role === 'MAYOR' ? 2 : 1;
      voteWeights[target] = (voteWeights[target] || 0) + weight;
    }
  }

  let maxVotes = 0;
  let topCandidates: string[] = [];

  for (const [target, count] of Object.entries(voteWeights)) {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [target];
    } else if (count === maxVotes) {
      topCandidates.push(target);
    }
  }

  let eliminatedId: string | null = null;
  let tie = false;
  let roleRevealed: Role | undefined = undefined;
  const newPlayers = { ...state.players };

  // If a tie occurred or no votes, nobody is eliminated
  if (topCandidates.length > 1 || topCandidates.length === 0) {
    tie = true;
    eliminatedId = null;
  } else {
    const winnerCandidate = topCandidates[0];
    if (winnerCandidate === 'skip') {
      // Majority chose skip
      eliminatedId = null;
      tie = false;
    } else {
      // Single candidate with strictly highest votes
      eliminatedId = winnerCandidate;
      tie = false;
      const eliminatedPlayer = newPlayers[eliminatedId];
      if (eliminatedPlayer) {
        newPlayers[eliminatedId] = {
          ...eliminatedPlayer,
          isAlive: false,
        };
        roleRevealed = eliminatedPlayer.role;
      }
    }
  }

  const voteResult: VoteResult = {
    eliminatedId,
    role: roleRevealed,
    tie,
  };

  const now = Date.now();
  let desc = '';
  let descTa = '';

  if (tie) {
    desc = 'The village could not reach a consensus. Nobody was eliminated.';
    descTa = 'கிராம மக்கள் ஒருமித்த முடிவை எடுக்க முடியவில்லை. யாரும் வெளியேற்றப்படவில்லை.';
  } else if (!eliminatedId) {
    desc = 'The village decided to skip elimination for today.';
    descTa = 'இன்றைய தினம் யாரையும் வெளியேற்றுவதில்லை என்று கிராம மக்கள் முடிவு செய்தனர்.';
  } else {
    const p = state.players[eliminatedId];
    desc = `${p.nickname} was voted out and eliminated! Their role was ${roleRevealed}.`;
    descTa = `${p.nickname} வாக்குகளால் வெளியேற்றப்பட்டார்! அவர் பங்கு ${roleRevealed}.`;
  }

  const timelineEntry: TimelineEntry = {
    id: `tl_${now}_result_${state.round}`,
    round: state.round,
    phase: 'RESULT',
    title: `Day ${state.round} Result`,
    description: desc,
    titleTa: `நாள் ${state.round} முடிவு`,
    descriptionTa: descTa,
    timestamp: now,
  };

  // Check if Jester won
  let winner: Winner | null = null;
  if (eliminatedId && state.players[eliminatedId]?.role === 'JESTER') {
    winner = 'JESTER';
  } else {
    winner = checkWinCondition({ ...state, players: newPlayers });
  }

  return {
    ...state,
    phase: winner ? 'GAME_OVER' : 'RESULT',
    winner,
    players: newPlayers,
    voteResult,
    timeline: [...state.timeline, timelineEntry],
    phaseEndTime: now + state.settings.resultDurationSec * 1000,
    lastActiveAt: now,
  };
}

/**
 * Checks win conditions:
 * - Villagers win when all Mafia are eliminated.
 * - Mafia win when Mafia count >= non-Mafia alive count.
 */
export function checkWinCondition(state: Pick<GameState, 'players'>): Winner | null {
  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  const aliveMafia = alivePlayers.filter((p) => p.role === 'MAFIA');
  const aliveNonMafia = alivePlayers.filter((p) => p.role !== 'MAFIA');

  if (aliveMafia.length === 0) {
    return 'VILLAGERS';
  }

  if (aliveMafia.length >= aliveNonMafia.length) {
    return 'MAFIA';
  }

  return null;
}

/**
 * Returns the secure view for a specific player:
 * - Never leaks hidden roles!
 * - Villager/Doctor/Detective never see who the Mafia are.
 * - Mafia only see fellow Mafia.
 * - Roles of alive players are hidden until GAME_OVER.
 * - Roles of dead players:
 *   - At Dawn, do NOT reveal role of the dead until game ends.
 *   - In Result (voting elimination), the eliminated player's role is revealed.
 */
export function getPlayerView(state: GameState, playerId: string): PlayerGameView {
  const me = state.players[playerId];
  const now = Date.now();
  const phaseRemainingMs = Math.max(0, state.phaseEndTime - now);

  const isGameOver = state.phase === 'GAME_OVER';
  const isMafia = me?.role === 'MAFIA';

  // Build teammates list if Mafia
  let teammates: { id: string; nickname: string; role: Role }[] | undefined = undefined;
  if (isMafia) {
    teammates = Object.values(state.players)
      .filter((p) => p.role === 'MAFIA')
      .map((p) => ({ id: p.id, nickname: p.nickname, role: 'MAFIA' as Role }));
  }

  // Public players list with stripped roles
  const publicPlayers: PublicPlayer[] = Object.values(state.players).map((p) => {
    let revealedRole: Role | undefined = undefined;

    if (isGameOver) {
      revealedRole = p.role;
    } else if (p.id === playerId) {
      revealedRole = p.role;
    } else if (isMafia && p.role === 'MAFIA') {
      revealedRole = 'MAFIA';
    } else if (!p.isAlive && state.voteResult?.eliminatedId === p.id && state.voteResult.role) {
      // Explicitly revealed in vote result
      revealedRole = state.voteResult.role;
    }

    return {
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isAlive: p.isAlive,
      avatarSeed: p.avatarSeed,
      role: revealedRole,
    };
  });

  // Calculate vote counts during voting
  const voteCounts: Record<string, number> = {};
  if (state.phase === 'VOTING') {
    for (const target of Object.values(state.votes)) {
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
  }

  // Determine if this player has submitted their action
  let hasSubmittedAction = false;
  if (state.phase === 'NIGHT' && me && me.isAlive) {
    if (me.role === 'MAFIA') {
      hasSubmittedAction = !!state.nightActions.mafiaVotes[playerId];
    } else if (me.role === 'DOCTOR') {
      hasSubmittedAction = !!state.nightActions.doctorTarget;
    } else if (me.role === 'DETECTIVE') {
      hasSubmittedAction = !!state.nightActions.detectiveTarget;
    } else {
      hasSubmittedAction = true; // Villagers have no night action
    }
  } else if (state.phase === 'VOTING' && me && me.isAlive) {
    hasSubmittedAction = state.votes[playerId] !== undefined;
  }

  // Night action result: only for Detective
  const nightActionResult =
    me?.role === 'DETECTIVE' ? state.lastInvestigationResults[playerId] : undefined;

  return {
    roomId: state.roomId,
    roomCode: state.roomCode,
    phase: state.phase,
    phaseRemainingMs,
    phaseEndTime: state.phaseEndTime,
    round: state.round,
    myPlayerId: playerId,
    myRole: me?.role,
    doctorSelfProtectUsed: me?.doctorSelfProtectUsed,
    teammates,
    players: publicPlayers,
    nightActionResult,
    dawnResult: state.dawnResult || undefined,
    voteResult: state.voteResult || undefined,
    winner: state.winner || undefined,
    timeline: state.timeline,
    settings: state.settings,
    skipDiscussionVotes: Array.from(state.skipDiscussionVotes),
    currentVotes: state.phase === 'VOTING' ? state.votes : undefined,
    voteCounts: state.phase === 'VOTING' ? voteCounts : undefined,
    hasSubmittedAction,
  };
}

/**
 * Resets a finished game back to LOBBY state for "Play Again".
 */
export function resetToLobby(state: GameState): GameState {
  const now = Date.now();
  const resetPlayers: Record<string, Player> = {};

  for (const [id, p] of Object.entries(state.players)) {
    resetPlayers[id] = {
      ...p,
      isAlive: true,
      role: undefined,
      doctorSelfProtectUsed: false,
    };
  }

  return {
    ...state,
    phase: 'LOBBY',
    round: 0,
    players: resetPlayers,
    nightActions: { mafiaVotes: {} },
    votes: {},
    skipDiscussionVotes: new Set(),
    dawnResult: null,
    lastInvestigationResults: {},
    voteResult: null,
    winner: null,
    timeline: [],
    phaseEndTime: 0,
    lastActiveAt: now,
  };
}
