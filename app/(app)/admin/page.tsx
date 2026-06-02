'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  getAllUsers, getPrizes, getRankings,
  syncMatches, createPrize, awardPrize, deletePrize, updateUserRoles,
  deleteUser, getInviteCodes, createInviteCode, deleteInviteCode
} from '@/lib/api';
import type { InviteCode, User } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (user && !isAdmin()) router.push('/dashboard');
  }, [user, isAdmin, router]);

  const [tab, setTab] = useState<'users' | 'prizes' | 'sync' | 'invites'>('sync');

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
        {(['sync', 'prizes', 'users', 'invites'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {t === 'sync' ? '🔄 Sincronización' : t === 'prizes' ? '🎁 Premios' : t === 'users' ? '👥 Usuarios' : '🔑 Invitaciones'}
          </button>
        ))}
      </div>

      {tab === 'sync' && <SyncTab qc={qc} />}
      {tab === 'prizes' && <PrizesTab qc={qc} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'invites' && <InvitesTab qc={qc} />}
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
  const [form, setForm] = useState({ name: '', description: '', position: 1 });
  const [awardForm, setAwardForm] = useState<{ prizeId: number; userId: string } | null>(null);
  const [formError, setFormError] = useState('');

  const { data: prizes = [] } = useQuery({ queryKey: ['prizes'], queryFn: getPrizes });
  const { data: rankings = [] } = useQuery({ queryKey: ['rankings'], queryFn: getRankings });

  const createMutation = useMutation({
    mutationFn: () => createPrize(form.name, form.description, form.position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prizes'] });
      setForm({ name: '', description: '', position: 1 });
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
        <div className="grid sm:grid-cols-3 gap-4">
          <input
            placeholder="Nombre (ej: Premio 1er lugar)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 transition sm:col-span-1"
          />
          <input
            placeholder="Descripción (ej: $50.000 en efectivo)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 transition"
          />
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
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-sm">#{prize.position}</span>
                  <span className="text-white font-semibold">{prize.name}</span>
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

  function toggleAdmin(u: User) {
    const isCurrentlyAdmin = u.roles.includes('ADMIN');
    const newRoles = isCurrentlyAdmin
      ? u.roles.filter((r) => r !== 'ADMIN')
      : [...u.roles, 'ADMIN' as const];
    roleMutation.mutate({ userId: u.id, roles: newRoles });
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
        <span>Usuario</span>
        <span>Roles</span>
        <span></span>
        <span>Registrado</span>
      </div>
      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Cargando...</div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3">
              <div>
                <p className="text-white font-medium text-sm">{u.name}</p>
                <p className="text-slate-400 text-xs">{u.email}</p>
              </div>
              <div className="flex gap-1">
                {u.roles.map((role) => (
                  <span key={role} className={`text-xs px-2 py-1 rounded-full border ${
                    role === 'ADMIN'
                      ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30'
                      : 'text-slate-400 bg-slate-700/30 border-slate-600/30'
                  }`}>
                    {role}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => toggleAdmin(u)}
                  disabled={u.id === currentUser?.id || roleMutation.isPending}
                  title={u.id === currentUser?.id ? 'No puedes modificar tu propio rol' : ''}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
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
                      className="text-xs px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(u.id)}
                    disabled={u.id === currentUser?.id}
                    title={u.id === currentUser?.id ? 'No puedes eliminarte a ti mismo' : ''}
                    className="text-xs px-3 py-1.5 rounded-lg border text-red-400 bg-red-900/20 border-red-700/30 hover:bg-red-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <span className="text-slate-400 text-xs">
                {new Date(u.createdAt).toLocaleDateString('es-CL')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvitesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [copied, setCopied] = useState<number | null>(null);
  const { data: codes = [], isLoading } = useQuery({ queryKey: ['invite-codes'], queryFn: getInviteCodes });

  const createMutation = useMutation({
    mutationFn: createInviteCode,
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Códigos de invitación</h2>
            <p className="text-slate-400 text-sm mt-1">Genera un código y compártelo para que el usuario pueda registrarse.</p>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex-shrink-0 flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition"
          >
            {createMutation.isPending ? '⏳ Generando...' : '🔑 Generar código'}
          </button>
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
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
            <span>Código</span>
            <span>Estado</span>
            <span></span>
            <span>Creado</span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {codes.map((c) => (
              <div key={c.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3">
                <span className="font-mono text-white font-semibold tracking-wider text-sm">{c.code}</span>
                <div className="flex items-center gap-2">
                  {c.usado ? (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full border text-slate-400 bg-slate-700/30 border-slate-600/30">Usado</span>
                      {c.usadoPor && <span className="text-slate-500 text-xs">por {c.usadoPor.name}</span>}
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full border text-green-400 bg-green-900/20 border-green-700/30">Disponible</span>
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
      )}
    </div>
  );
}
