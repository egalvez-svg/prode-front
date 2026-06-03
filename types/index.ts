export type MatchStatus = 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' | 'POSTPONED';
export type MatchStage = 'GROUP_STAGE' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'THIRD_PLACE' | 'FINAL';
export type UserRole = 'USER' | 'ADMIN';
export type PrizeFase = 'GRUPOS' | 'ELIMINATORIA';

export interface Match {
  id: number;
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: MatchStage;
  group: string | null;
}

export interface Bet {
  id: number;
  userId?: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  points: number;
  match: Match;
}

export interface User {
  id: number;
  email: string;
  name: string;
  roles: UserRole[];
  accesoGrupos: boolean;
  accesoEliminatoria: boolean;
  activo: boolean;
  createdAt: string;
  bets: Bet[];
}

export interface RankingEntry {
  position: number;
  id: number;
  name: string;
  email: string;
  totalPoints: number;
  totalBets: number;
  exactScores: number;
  correctResults: number;
}

export interface Prize {
  id: number;
  name: string;
  description: string;
  position: number;
  fase?: PrizeFase | null;
  awardedTo: { id: number; name: string; email: string } | null;
  awardedToUserId: number | null;
}

export interface InviteCode {
  id: number;
  code: string;
  usado: boolean;
  usadoPor: { id: number; name: string; email: string } | null;
  creadoEn: string;
  creadoPor: number;
  accesoGrupos: boolean;
  accesoEliminatoria: boolean;
}

export interface AuthResponse {
  access_token: string;
}
