'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getMyRanking, getMatches, getMyBets } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StageBadge from '@/components/StageBadge';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: ranking } = useQuery({ queryKey: ['ranking-me'], queryFn: getMyRanking });
  const { data: matches } = useQuery({ queryKey: ['matches', 'SCHEDULED'], queryFn: () => getMatches('SCHEDULED') });
  const { data: bets } = useQuery({ queryKey: ['bets-me'], queryFn: getMyBets });

  const nextMatches = matches?.slice(0, 3) ?? [];
  const recentBets = bets?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Mundial FIFA 2026 — ¡Haz tus apuestas!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Posición" value={ranking ? `#${ranking.position}` : '—'} icon="🏆" color="yellow" />
        <StatCard label="Puntos" value={ranking?.totalPoints ?? 0} icon="⭐" color="green" />
        <StatCard label="Aciertos exactos" value={ranking?.exactScores ?? 0} icon="🎯" color="blue" />
        <StatCard label="Apuestas hechas" value={ranking?.totalBets ?? 0} icon="📋" color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximos partidos */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">⚽ Próximos partidos</h2>
            <Link href="/matches" className="text-green-400 text-sm hover:text-green-300">Ver todos →</Link>
          </div>
          {nextMatches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No hay partidos programados</p>
          ) : (
            <div className="space-y-3">
              {nextMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                  <div className="text-sm min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StageBadge stage={m.stage} group={m.group} />
                    </div>
                    <p className="text-white font-medium">{m.homeTeam} vs {m.awayTeam}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {format(new Date(m.matchDate), "dd MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Link href="/matches" className="ml-3 shrink-0 text-xs bg-green-600/20 text-green-400 border border-green-600/30 rounded-full px-2.5 py-1 hover:bg-green-600/30 transition">
                    Apostar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Últimas apuestas */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">🎯 Últimas apuestas</h2>
            <Link href="/bets" className="text-green-400 text-sm hover:text-green-300">Ver todas →</Link>
          </div>
          {recentBets.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Aún no has hecho apuestas</p>
          ) : (
            <div className="space-y-3">
              {recentBets.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                  <div className="text-sm min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StageBadge stage={b.match.stage} group={b.match.group} />
                    </div>
                    <p className="text-white font-medium">{b.match.homeTeam} vs {b.match.awayTeam}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Tu apuesta: {b.homeScore} - {b.awayScore}</p>
                  </div>
                  <PointsBadge points={b.points} status={b.match.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Puntaje */}
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-700/30 rounded-xl p-5">
        <h3 className="font-semibold text-green-300 mb-3">📊 Sistema de puntos</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="bg-slate-800/50 rounded-lg py-3">
            <p className="text-2xl font-bold text-green-400">3</p>
            <p className="text-slate-300 mt-1">Marcador exacto</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg py-3">
            <p className="text-2xl font-bold text-yellow-400">1</p>
            <p className="text-slate-300 mt-1">Resultado correcto</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg py-3">
            <p className="text-2xl font-bold text-red-400">0</p>
            <p className="text-slate-300 mt-1">Incorrecto</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    yellow: 'from-yellow-900/30 to-yellow-800/10 border-yellow-700/30 text-yellow-400',
    green: 'from-green-900/30 to-green-800/10 border-green-700/30 text-green-400',
    blue: 'from-blue-900/30 to-blue-800/10 border-blue-700/30 text-blue-400',
    purple: 'from-purple-900/30 to-purple-800/10 border-purple-700/30 text-purple-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
    </div>
  );
}


function PointsBadge({ points, status }: { points: number; status: string }) {
  if (status !== 'FINISHED') return <span className="text-xs text-slate-500 bg-slate-700/50 rounded-full px-2 py-1">Pendiente</span>;
  if (points === 3) return <span className="text-xs text-green-400 bg-green-900/30 border border-green-700/30 rounded-full px-2 py-1">+3 pts ⭐</span>;
  if (points === 1) return <span className="text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/30 rounded-full px-2 py-1">+1 pt</span>;
  return <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/30 rounded-full px-2 py-1">0 pts</span>;
}
