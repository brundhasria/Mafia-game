export type Role = 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'VILLAGER' | 'JESTER' | 'MAYOR';

export type RoleAlignment = 'MAFIA' | 'VILLAGE' | 'NEUTRAL';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'NIGHT'
  | 'DAWN'
  | 'DAY_DISCUSSION'
  | 'VOTING'
  | 'RESULT'
  | 'GAME_OVER';

export type Winner = 'MAFIA' | 'VILLAGERS' | 'JESTER';

export interface GameSettings {
  nightDurationSec: number;
  dawnDurationSec: number;
  discussionDurationSec: number;
  votingDurationSec: number;
  resultDurationSec: number;
  roleRevealDurationSec: number;
  enableJester: boolean;
  enableMayor: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  nightDurationSec: 45,
  dawnDurationSec: 6,
  discussionDurationSec: 90,
  votingDurationSec: 30,
  resultDurationSec: 8,
  roleRevealDurationSec: 8,
  enableJester: false,
  enableMayor: false,
};

export interface Player {
  id: string;
  nickname: string;
  sessionToken: string;
  isHost: boolean;
  isConnected: boolean;
  isAlive: boolean;
  role?: Role;
  doctorSelfProtectUsed?: boolean;
  avatarSeed: string;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAlive: boolean;
  avatarSeed: string;
  role?: Role; // only revealed when allowed
}

export interface NightActions {
  mafiaVotes: Record<string, string>; // mafiaPlayerId -> targetPlayerId
  doctorTarget?: string; // doctorPlayerId -> targetPlayerId
  detectiveTarget?: string; // detectivePlayerId -> targetPlayerId
}

export interface InvestigationResult {
  targetId: string;
  isMafia: boolean;
}

export interface DawnResult {
  victimId: string | null;
  saved: boolean;
}

export interface VoteResult {
  eliminatedId: string | null;
  role?: Role;
  tie: boolean;
}

export interface TimelineEntry {
  id: string;
  round: number;
  phase: GamePhase;
  title: string;
  description: string;
  titleTa?: string;
  descriptionTa?: string;
  timestamp: number;
}

export type ChatChannel = 'public' | 'mafia' | 'ghost';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  channel: ChatChannel;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: Record<string, Player>;
  hostId: string;
  settings: GameSettings;
  nightActions: NightActions;
  votes: Record<string, string | 'skip'>; // voterId -> targetId | 'skip'
  skipDiscussionVotes: Set<string>; // set of playerIds
  dawnResult: DawnResult | null;
  lastInvestigationResults: Record<string, InvestigationResult>; // detectiveId -> result
  voteResult: VoteResult | null;
  winner: Winner | null;
  timeline: TimelineEntry[];
  chatMessages: ChatMessage[];
  phaseEndTime: number; // unix timestamp ms
  createdAt: number;
  lastActiveAt: number;
}

export interface PlayerGameView {
  roomId: string;
  roomCode: string;
  phase: GamePhase;
  phaseRemainingMs: number;
  phaseEndTime?: number;
  round: number;
  myPlayerId: string;
  myRole?: Role;
  doctorSelfProtectUsed?: boolean;
  teammates?: { id: string; nickname: string; role: Role }[];
  players: PublicPlayer[];
  nightActionResult?: InvestigationResult;
  dawnResult?: DawnResult;
  voteResult?: VoteResult;
  winner?: Winner;
  timeline: TimelineEntry[];
  settings: GameSettings;
  skipDiscussionVotes: string[];
  currentVotes?: Record<string, string | 'skip'>;
  voteCounts?: Record<string, number>;
  hasSubmittedAction: boolean;
}

export interface RoomResponse {
  success: boolean;
  error?: string;
  roomId?: string;
  roomCode?: string;
  sessionToken?: string;
  playerId?: string;
  view?: PlayerGameView;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}
