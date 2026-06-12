'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  getAllUsers, getPrizes, getRankings,
  syncMatches, createPrize, awardPrize, deletePrize, updateUserRoles,
  deleteUser, updateUserAcceso, getInviteCodes, createInviteCode, deleteInviteCode,
  getMatches, toggleMatchRanking,
} from '@/lib/api';
import type { InviteCode, Match, PrizeFase, User } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatSectionLabel } from '@/components/StageBadge';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (user && !isAdmin()) router.push('/dashboard');
  }, [user, isAdmin, router]);

  const [tab, setTab] = useState<'users' | 'prizes' | 'sync' | 'invites' | 'matches'>('sync');

  if (!user || !isAdmin()) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚙️</span>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
          <p className="text-slate-400 text-sm">Acceso exclusivo para administradores</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['sync', 'prizes', 'users', 'invites', 'matches'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {t === 'sync' ? '🔄 Sincronización' : t === 'prizes' ? '🎁 Premios' : t === 'users' ? '👥 Usuarios' : t === 'invites' ? '🔑 Invitaciones' : '⚽ Partidos'}
          </button>
        ))}
      </div>

      {tab === 'sync' && <SyncTab qc={qc} />}
      {tab === 'prizes' && <PrizesTab qc={qc} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'invites' && <InvitesTab qc={qc} />}
      {tab === 'matches' && <MatchesTab qc={qc} />}
    </div>
  );
}

function SyncTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const syncMutation = useMutation({
    mutationFn: syncMatches,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Sincronizar partidos</h2>
      <p className="text-slate-400 text-sm">
        Fuerza la sincronización con la API de fútbol para actualizar partidos y calcular puntajes.
        La sincronización automática ocurre cada 30 minutos.
      </p>
      <button
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition"
      >
        {syncMutation.isPending ? '⏳ Sincronizando...' : '🔄 Sincronizar ahora'}
      </button>
      {syncMutation.isSuccess && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg px-4 py-2 text-sm">
          ✅ Sincronización completada
        </div>
      )}
      {syncMutation.isError && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg px-4 py-2 text-sm">
          ❌ Error al sincronizar
        </div>
      )}
    </div>
  );
}

function PrizesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({ name: '', description: '', position: 1, fase: 'GRUPOS' as PrizeFase });
  const [awardForm, setAwardForm] = useState<{ prizeId: number; userId: string } | null>(null);
  const [formError, setFormError] = useState('');

  const { data: prizes = [] } = useQuery({ queryKey: ['prizes'], queryFn: () => getPrizes() });
  const { data: rankings = [] } = useQuery({ queryKey: ['rankings'], queryFn: getRankings });

  const createMutation = useMutation({
    mutationFn: () => createPrize(form.name, form.description, form.position, form.fase),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prizes'] });
      setForm({ name: '', description: '', position: 1, fase: 'GRUPOS' });
      setFormError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Error al crear premio');
    },
  });

  const awardMutation = useMutation({
    mutationFn: ({ prizeId, userId }: { prizeId: number; userId: number }) => awardPrize(prizeId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prizes'] });
      setAwardForm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePrize(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prizes'] }),
  });

  const sorted = [...prizes].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Create prize */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Crear premio</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            placeholder="Nombre (ej: Premio 1er lugar)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 transition"
          />
          <input
            placeholder="Descripción (ej: $50.000 en efectivo)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 transition"
          />
          <select
            value={form.fase}
            onChange={(e) => setForm({ ...form, fase: e.target.value as PrizeFase })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition"
          >
            <option value="GRUPOS">Fase de Grupos</option>
            <option value="ELIMINATORIA">Fase Eliminatoria</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              placeholder="Posición"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 1 })}
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 transition"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name || !form.description}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition"
            >
              Crear
            </button>
          </div>
        </div>
        {formError && (
          <p className="text-red-400 text-sm mt-2">{formError}</p>
        )}
      </div>

      {/* Prizes list */}
      <div className="space-y-3">
        {sorted.map((prize) => (
          <div key={prize.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-yellow-400 font-bold text-sm">#{prize.position}</span>
                  <span className="text-white font-semibold">{prize.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    prize.fase === 'GRUPOS'
                      ? 'text-green-400 bg-green-900/20 border-green-700/30'
                      : 'text-purple-400 bg-purple-900/20 border-purple-700/30'
                  }`}>
                    {prize.fase === 'GRUPOS' ? 'Grupos' : 'Eliminatoria'}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-0.5">{prize.description}</p>
                {prize.awardedTo ? (
                  <p className="text-green-400 text-xs mt-1">🏆 Asignado a: {prize.awardedTo.name}</p>
                ) : (
                  <p className="text-slate-500 text-xs mt-1">Sin asignar</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {awardForm?.prizeId === prize.id ? (
                  <div className="flex gap-2 items-center">
                    <select
                      value={awardForm.userId}
                      onChange={(e) => setAwardForm({ ...awardForm, userId: e.target.value })}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {rankings.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} ({r.totalPoints} pts)</option>
                      ))}
                    </select>
                    <button
                      onClick={() => awardMutation.mutate({ prizeId: prize.id, userId: parseInt(awardForm.userId) })}
                      disabled={!awardForm.userId || awardMutation.isPending}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition"
                    >
                      Asignar
                    </button>
                    <button onClick={() => setAwardForm(null)} className="text-slate-400 hover:text-white px-2">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAwardForm({ prizeId: prize.id, userId: '' })}
                    className="text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg transition"
                  >
                    Asignar
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(prize.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 px-3 py-1.5 rounded-lg transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessToggle({ on, onChange, disabled, color, label }: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  color: 'green' | 'purple';
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed ${
        on
          ? color === 'green' ? 'bg-green-500' : 'bg-purple-500'
          : 'bg-slate-600'
      }`}
    >
      <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform ${
        on ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getAllUsers });

  const roleMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: number; roles: ('USER' | 'ADMIN')[] }) =>
      updateUserRoles(userId, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
  });

  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  function toggleAdmin(u: User) {
    const isCurrentlyAdmin = u.roles.includes('ADMIN');
    const newRoles = isCurrentlyAdmin
      ? u.roles.filter((r) => r !== 'ADMIN')
      : [...u.roles, 'ADMIN' as const];
    roleMutation.mutate({ userId: u.id, roles: newRoles });
  }

  async function toggleAcceso(u: User, field: 'accesoGrupos' | 'accesoEliminatoria') {
    const key = `${u.id}:${field}`;
    if (pendingToggles.has(key)) return;
    setPendingToggles(prev => new Set([...prev, key]));
    try {
      const updated = await updateUserAcceso(
        u.id,
        field === 'accesoGrupos' ? !u.accesoGrupos : !!u.accesoGrupos,
        field === 'accesoEliminatoria' ? !u.accesoEliminatoria : !!u.accesoEliminatoria,
      );
      qc.setQueryData<User[]>(['users'], (old = []) =>
        old.map(usr =>
          usr.id === u.id
            ? { ...usr, accesoGrupos: updated.accesoGrupos, accesoEliminatoria: updated.accesoEliminatoria }
            : usr
        )
      );
    } finally {
      setPendingToggles(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Registrado</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Roles</th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Grupos</th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Eliminatoria</th>
              <th scope="col" className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">Cargando...</td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-white font-medium">{u.name}</p>
                  <p className="text-slate-400 text-xs">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs tabular-nums whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.map((role) => (
                      <span key={role} className={`text-xs px-2 py-0.5 rounded-full border ${
                        role === 'ADMIN'
                          ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30'
                          : 'text-slate-400 bg-slate-700/30 border-slate-600/30'
                      }`}>
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <AccessToggle
                    on={u.accesoGrupos}
                    onChange={() => toggleAcceso(u, 'accesoGrupos')}
                    disabled={pendingToggles.has(`${u.id}:accesoGrupos`)}
                    color="green"
                    label={`Acceso fase grupos para ${u.name}`}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <AccessToggle
                    on={u.accesoEliminatoria}
                    onChange={() => toggleAcceso(u, 'accesoEliminatoria')}
                    disabled={pendingToggles.has(`${u.id}:accesoEliminatoria`)}
                    color="purple"
                    label={`Acceso eliminatoria para ${u.name}`}
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 items-center justify-end">
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={u.id === currentUser?.id || roleMutation.isPending}
                      aria-label={u.roles.includes('ADMIN') ? `Quitar admin a ${u.name}` : `Hacer admin a ${u.name}`}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed ${
                        u.roles.includes('ADMIN')
                          ? 'text-orange-400 bg-orange-900/20 border-orange-700/30 hover:bg-orange-900/40'
                          : 'text-green-400 bg-green-900/20 border-green-700/30 hover:bg-green-900/40'
                      }`}
                    >
                      {u.roles.includes('ADMIN') ? 'Quitar Admin' : 'Hacer Admin'}
                    </button>
                    {confirmDelete === u.id ? (
                      <div className="flex gap-1 items-center">
                        <span className="text-red-400 text-xs">¿Confirmar?</span>
                        <button
                          onClick={() => deleteMutation.mutate(u.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        disabled={u.id === currentUser?.id}
                        aria-label={`Eliminar usuario ${u.name}`}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-400 bg-red-900/20 border-red-700/30 hover:bg-red-900/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [confirmToggle, setConfirmToggle] = useState<number | null>(null);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches-admin'],
    queryFn: () => getMatches(),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleMatchRanking(id),
    onSuccess: (data) => {
      qc.setQueryData<Match[]>(['matches-admin'], (old = []) =>
        old.map((m) => (m.id === data.id ? { ...m, countForRanking: data.countForRanking } : m))
      );
      setConfirmToggle(null);
    },
  });

  const sorted = [...matches].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700/50">
        <p className="text-slate-400 text-sm">
          Los partidos excluidos no se contabilizan en el ranking para ningún usuario.
        </p>
      </div>
      {isLoading ? (
        <div className="text-center py-10 text-slate-500">Cargando partidos...</div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {sorted.map((match) => {
            const excluded = match.countForRanking === false;
            const isPending = toggleMutation.isPending && toggleMutation.variables === match.id;
            return (
              <div
                key={match.id}
                className={`flex items-center justify-between gap-4 px-5 py-3 transition-colors ${excluded ? 'opacity-60 bg-slate-900/20' : 'hover:bg-slate-700/10'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {match.status === 'FINISHED' || match.status === 'IN_PLAY' ? (
                      <span className="text-white font-medium text-sm">
                        {match.homeTeam}
                        <span className={`mx-2 font-bold tabular-nums ${match.status === 'IN_PLAY' ? 'text-green-400' : 'text-slate-100'}`}>
                          {match.homeScore ?? 0} - {match.awayScore ?? 0}
                        </span>
                        {match.awayTeam}
                      </span>
                    ) : (
                      <span className="text-white font-medium text-sm">
                        {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                      </span>
                    )}
                    <AdminMatchStatusBadge status={match.status} />
                    {excluded && (
                      <span className="text-xs px-2 py-0.5 rounded-full border text-orange-400 bg-orange-900/20 border-orange-700/30">
                        Excluido del ranking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-500 text-xs">
                      {format(new Date(match.matchDate), "d MMM · HH:mm", { locale: es })}
                    </span>
                    {match.group && (
                      <span className="text-slate-600 text-xs">{formatSectionLabel(match.group)}</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {confirmToggle === match.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-xs">¿Confirmar?</span>
                      <button
                        onClick={() => toggleMutation.mutate(match.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmToggle(null)}
                        className="text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmToggle(match.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        excluded
                          ? 'text-green-400 bg-green-900/20 border-green-700/30 hover:bg-green-900/40'
                          : 'text-orange-400 bg-orange-900/20 border-orange-700/30 hover:bg-orange-900/40'
                      }`}
                    >
                      {excluded ? 'Incluir en ranking' : 'Excluir del ranking'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvitesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [newAcceso, setNewAcceso] = useState({ grupos: false, eliminatoria: false });
  const { data: codes = [], isLoading } = useQuery({ queryKey: ['invite-codes'], queryFn: getInviteCodes });

  const createMutation = useMutation({
    mutationFn: () => createInviteCode(newAcceso.grupos, newAcceso.eliminatoria),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite-codes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInviteCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite-codes'] }),
  });

  async function copyCode(c: InviteCode) {
    await navigator.clipboard.writeText(c.code);
    setCopied(c.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Códigos de invitación</h2>
            <p className="text-slate-400 text-sm mt-1">Genera un código y compártelo para que el usuario pueda registrarse.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAcceso.grupos}
                onChange={(e) => setNewAcceso({ ...newAcceso, grupos: e.target.checked })}
                className="w-4 h-4 rounded accent-green-500"
              />
              <span className="text-slate-300 text-sm">Fase Grupos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAcceso.eliminatoria}
                onChange={(e) => setNewAcceso({ ...newAcceso, eliminatoria: e.target.checked })}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-slate-300 text-sm">Eliminatoria</span>
            </label>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || (!newAcceso.grupos && !newAcceso.eliminatoria)}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition"
            >
              {createMutation.isPending ? '⏳ Generando...' : '🔑 Generar código'}
            </button>
          </div>
        </div>
        {createMutation.isSuccess && createMutation.data && (
          <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-green-400 text-xs mb-1">Nuevo código generado:</p>
              <p className="text-white font-mono font-bold text-xl tracking-widest">{createMutation.data.code}</p>
            </div>
            <button
              onClick={() => copyCode(createMutation.data!)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              {copied === createMutation.data.id ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Cargando...</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No hay códigos generados aún</div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
            <span>Código</span>
            <span>Estado / Acceso</span>
            <span></span>
            <span>Creado</span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {codes.map((c) => (
              <div key={c.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3">
                <span className="font-mono text-white font-semibold tracking-wider text-sm">{c.code}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.usado ? (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full border text-slate-400 bg-slate-700/30 border-slate-600/30">Usado</span>
                      {c.usadoPor && <span className="text-slate-500 text-xs">por {c.usadoPor.name}</span>}
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full border text-green-400 bg-green-900/20 border-green-700/30">Disponible</span>
                  )}
                  {c.accesoGrupos && (
                    <span className="text-xs px-2 py-0.5 rounded-full border text-green-400 bg-green-900/20 border-green-700/30">Grupos</span>
                  )}
                  {c.accesoEliminatoria && (
                    <span className="text-xs px-2 py-0.5 rounded-full border text-purple-400 bg-purple-900/20 border-purple-700/30">Eliminatoria</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!c.usado && (
                    <>
                      <button
                        onClick={() => copyCode(c)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        {copied === c.id ? '✅ Copiado' : '📋 Copiar'}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-400 bg-red-900/20 border-red-700/30 hover:bg-red-900/40 transition disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
                <span className="text-slate-400 text-xs whitespace-nowrap">
                  {new Date(c.creadoEn).toLocaleDateString('es-CL')}
                </span>
              </div>
            ))}
          </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ADMIN_STATUS_CFG: Record<string, { text: string; className: string }> = {
  FINISHED:  { text: 'Finalizado', className: 'text-slate-400 bg-slate-700/30 border-slate-600/30' },
  IN_PLAY:   { text: 'En juego',   className: 'text-green-400 bg-green-900/30 border-green-700/30' },
  SCHEDULED: { text: 'Programado', className: 'text-blue-400 bg-blue-900/30 border-blue-700/30' },
  POSTPONED: { text: 'Postergado', className: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
};

function AdminMatchStatusBadge({ status }: { status: string }) {
  const cfg = ADMIN_STATUS_CFG[status] ?? ADMIN_STATUS_CFG.SCHEDULED;
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${cfg.className}`}>
      {cfg.text}
    </span>
  );
}
