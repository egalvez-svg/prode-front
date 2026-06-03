'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMatches, getMyBets } from '@/lib/api';
import type { Match, Bet, MatchStatus } from '@/types';
import BetModal from '@/components/BetModal';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatSectionLabel } from '@/components/StageBadge';
import { useAuthStore } from '@/store/authStore';

const STATUS_TABS: { label: string; value: MatchStatus | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Por jugar', value: 'SCHEDULED' },
  { label: 'En juego', value: 'IN_PLAY' },
  { label: 'Finalizados', value: 'FINISHED' },
];

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  SCHEDULED: { text: 'Programado', className: 'text-blue-400 bg-blue-900/30 border-blue-700/30' },
  IN_PLAY: { text: 'En juego', className: 'text-green-400 bg-green-900/30 border-green-700/30 animate-pulse' },
  FINISHED: { text: 'Finalizado', className: 'text-slate-400 bg-slate-700/30 border-slate-600/30' },
  POSTPONED: { text: 'Postergado', className: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
};

export default function MatchesPage() {
  const [tab, setTab] = useState<MatchStatus | 'ALL'>('SCHEDULED');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { user } = useAuthStore();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', tab],
    queryFn: () => getMatches(tab === 'ALL' ? undefined : tab),
    refetchInterval: 60_000,
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bets-me'],
    queryFn: getMyBets,
  });

  const betsByMatchId = bets.reduce<Record<number, Bet>>((acc, b) => {
    acc[b.matchId] = b;
    return acc;
  }, {});

  const accessibleMatches = matches.filter((m) => {
    if (m.stage === 'GROUP_STAGE') return user?.accesoGrupos ?? true;
    return user?.accesoEliminatoria ?? true;
  });

  const grouped = accessibleMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group ?? m.stage;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const selectedBet = selectedMatch ? betsByMatchId[selectedMatch.id] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">⚽ Partidos</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.value
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando partidos...</div>
      ) : accessibleMatches.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No hay partidos en esta categoría</div>
      ) : (
        Object.entries(grouped).map(([group, groupMatches]) => (
          <section key={group}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">{formatSectionLabel(group)}</h2>
            <div className="space-y-3">
              {groupMatches.map((match) => {
                const bet = betsByMatchId[match.id];
                const minutesToMatch = (new Date(match.matchDate).getTime() - Date.now()) / 60000;
                const canBet = match.status === 'SCHEDULED' && minutesToMatch > 30;
                const closingSoon = match.status === 'SCHEDULED' && minutesToMatch <= 60 && minutesToMatch > 30;

                return (
                  <div
                    key={match.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition cursor-pointer"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-center">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{match.homeTeam}</p>
                          </div>

                          <div className="flex-shrink-0 text-center">
                            {match.status === 'FINISHED' || match.status === 'IN_PLAY' ? (
                              <div className="bg-slate-700/50 rounded-lg px-3 py-1 min-w-[60px]">
                                <p className="font-bold text-white text-lg">
                                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                                </p>
                              </div>
                            ) : (
                              <div className="text-center px-2">
                                <p className="text-slate-500 font-medium text-xs">VS</p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                  {format(new Date(match.matchDate), 'HH:mm')}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 text-center">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{match.awayTeam}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">
                            {match.status === 'SCHEDULED'
                              ? `${format(new Date(match.matchDate), "dd MMM", { locale: es })} · En ${formatDistanceToNow(new Date(match.matchDate), { locale: es })}`
                              : format(new Date(match.matchDate), "dd MMM HH:mm", { locale: es })}
                          </span>
                          <StatusBadge status={match.status} />
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {bet ? (
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Tu apuesta</p>
                            <p className="text-sm font-bold text-white">{bet.homeScore} - {bet.awayScore}</p>
                            {match.status === 'FINISHED' && (
                              <PointsBadge points={bet.points} />
                            )}
                          </div>
                        ) : (
                          canBet && (
                            <button
                              className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 rounded-full px-3 py-1 hover:bg-green-600/30 transition whitespace-nowrap"
                              onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); }}
                            >
                              Apostar
                            </button>
                          )
                        )}
                        {closingSoon && (
                          <p className="text-xs text-yellow-400">⏰ Cierra pronto</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {selectedMatch && (
        <BetModal
          match={selectedMatch}
          existingBet={betsByMatchId[selectedMatch.id]}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status];
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${cfg.className}`}>
      {cfg.text}
    </span>
  );
}

function PointsBadge({ points }: { points: number }) {
  if (points === 3) return <span className="text-xs text-green-400 font-bold">+3 ⭐</span>;
  if (points === 1) return <span className="text-xs text-yellow-400 font-bold">+1</span>;
  return <span className="text-xs text-red-400">0 pts</span>;
}
