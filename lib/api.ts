import axios from 'axios';
import type { AuthResponse, Bet, InviteCode, Match, Prize, PrizeFase, RankingEntry, User, UserRole } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data);

export const register = (email: string, name: string, password: string, inviteCode: string) =>
  api.post<AuthResponse>('/auth/register', { email, name, password, inviteCode }).then((r) => r.data);

// Users
export const getMe = () => api.get<User>('/users/me').then((r) => r.data);
export const getAllUsers = () => api.get<User[]>('/users').then((r) => r.data);
export const updateUserRoles = (userId: number, roles: UserRole[]) =>
  api.patch<User>(`/users/${userId}/roles`, { roles }).then((r) => r.data);
export const deleteUser = (userId: number) =>
  api.delete(`/users/${userId}`).then((r) => r.data);

export const updateUserAcceso = (userId: number, accesoGrupos: boolean, accesoEliminatoria: boolean) =>
  api.patch<User>(`/users/${userId}/acceso`, { accesoGrupos, accesoEliminatoria }).then((r) => r.data);

// Invite codes
export const getInviteCodes = () => api.get<InviteCode[]>('/invite-codes').then((r) => r.data);
export const createInviteCode = (accesoGrupos: boolean, accesoEliminatoria: boolean) =>
  api.post<InviteCode>('/invite-codes', { accesoGrupos, accesoEliminatoria }).then((r) => r.data);
export const deleteInviteCode = (id: number) => api.delete(`/invite-codes/${id}`).then((r) => r.data);

// Matches
export const getMatches = (status?: string) =>
  api.get<Match[]>('/matches', { params: status ? { status } : {} }).then((r) => r.data);

export const getMatch = (id: number) =>
  api.get<Match>(`/matches/${id}`).then((r) => r.data);

export const syncMatches = () =>
  api.post('/matches/sync').then((r) => r.data);

export const toggleMatchRanking = (id: number) =>
  api.patch<{ id: number; countForRanking: boolean }>(`/matches/${id}/toggle-ranking`).then((r) => r.data);

// Bets
export const createOrUpdateBet = (matchId: number, homeScore: number, awayScore: number) =>
  api.post<Bet>('/bets', { matchId, homeScore, awayScore }).then((r) => r.data);

export const getMyBets = () =>
  api.get<Bet[]>('/bets/me').then((r) => r.data);

export const deleteBet = (id: number) =>
  api.delete(`/bets/${id}`).then((r) => r.data);

// Rankings
export const getRankings = () =>
  api.get<RankingEntry[]>('/rankings').then((r) => r.data);

export const getMyRanking = () =>
  api.get<RankingEntry>('/rankings/me').then((r) => r.data);

// Prizes
export const getPrizes = (fase?: PrizeFase) =>
  api.get<Prize[]>('/prizes', { params: fase ? { fase } : {} }).then((r) => r.data);

export const createPrize = (name: string, description: string, position: number, fase: PrizeFase) =>
  api.post<Prize>('/prizes', { name, description, position, fase }).then((r) => r.data);

export const awardPrize = (prizeId: number, userId: number) =>
  api.patch<Prize>(`/prizes/${prizeId}/award`, { userId }).then((r) => r.data);

export const deletePrize = (id: number) =>
  api.delete(`/prizes/${id}`).then((r) => r.data);
