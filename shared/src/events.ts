import {
  GamePhase,
  Role,
  ChatMessage,
  PlayerGameView,
  RoomResponse,
  ActionResponse,
  GameSettings,
  PublicPlayer,
  Winner,
  TimelineEntry,
} from './types.js';

export interface ClientToServerEvents {
  'room:create': (data: { nickname: string }, callback: (res: RoomResponse) => void) => void;
  'room:join': (
    data: { code: string; nickname: string; sessionToken?: string },
    callback: (res: RoomResponse) => void
  ) => void;
  'room:reconnect': (
    data: { sessionToken: string },
    callback: (res: RoomResponse) => void
  ) => void;
  'room:start': (callback: (res: ActionResponse) => void) => void;
  'room:kick': (data: { targetPlayerId: string }, callback: (res: ActionResponse) => void) => void;
  'room:settings': (
    data: { settings: Partial<GameSettings> },
    callback: (res: ActionResponse) => void
  ) => void;
  'game:action': (
    data: { type: 'kill' | 'protect' | 'investigate'; targetId: string },
    callback: (res: ActionResponse) => void
  ) => void;
  'game:vote': (
    data: { targetId: string | 'skip' },
    callback: (res: ActionResponse) => void
  ) => void;
  'game:skip_discussion': (callback: (res: ActionResponse) => void) => void;
  'game:chat': (
    data: { text: string; channel: 'public' | 'mafia' | 'ghost' },
    callback: (res: ActionResponse) => void
  ) => void;
  'game:play_again': (callback: (res: ActionResponse) => void) => void;
}

export interface ServerToClientEvents {
  'game:state': (view: PlayerGameView) => void;
  'game:phase_change': (data: {
    phase: GamePhase;
    durationMs: number;
    narratorText: string;
    narratorTextTa: string;
  }) => void;
  'game:timer': (data: { remainingMs: number }) => void;
  'game:chat_message': (message: ChatMessage) => void;
  'game:investigation_result': (data: { targetId: string; isMafia: boolean }) => void;
  'game:dawn_result': (data: { deadPlayerId: string | null; saved: boolean }) => void;
  'game:vote_update': (data: {
    votes: Record<string, string | 'skip'>;
    voteCounts: Record<string, number>;
  }) => void;
  'game:vote_result': (data: { eliminatedPlayerId: string | null; role?: Role; tie: boolean }) => void;
  'game:over': (data: {
    winner: Winner;
    roles: Record<string, Role>;
    timeline: TimelineEntry[];
  }) => void;
  'game:toast': (data: { message: string; messageTa?: string; type: 'info' | 'error' | 'success' }) => void;
  'player:joined': (data: { player: PublicPlayer }) => void;
  'player:left': (data: { playerId: string; newHostId?: string }) => void;
  'player:status': (data: { playerId: string; isConnected: boolean }) => void;
}
