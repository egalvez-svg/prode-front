'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMatches, getMyBets } from '@/lib/api';
import type { Match, Bet, MatchStatus } from '@/types';
import BetModal from '@/components/BetModal';
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatSectionLabel } from '@/components/StageBadge';
import { useAuthStore } from '@/store/authStore';

type TabValue = MatchStatus | 'ALL' | 'GRUPOS';

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Por jugar', value: 'SCHEDULED' },
  { label: 'En juego', value: 'IN_PLAY' },
  { label: 'Finalizados', value: 'FINISHED' },
  { label: 'Grupos', value: 'GRUPOS' },
];

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  SCHEDULED: { text: 'Programado', className: 'text-blue-400 bg-blue-900/30 border-blue-700/30' },
  IN_PLAY: { text: 'En juego', className: 'text-green-400 bg-green-900/30 border-green-700/30' },
  FINISHED: { text: 'Finalizado', className: 'text-slate-400 bg-slate-700/30 border-slate-600/30' },
  POSTPONED: { text: 'Postergado', className: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
};

type TeamStanding = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function computeGroupStandings(matches: Match[]): Record<string, TeamStanding[]> {
  const groups: Record<string, Record<string, TeamStanding>> = {};

  for (const match of matches) {
    if (match.stage !== 'GROUP_STAGE' || !match.group) continue;
    const g = match.group;
    if (!groups[g]) groups[g] = {};
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!groups[g][team]) {
        groups[g][team] = { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      }
    }
  }

  for (const match of matches) {
    if (match.stage !== 'GROUP_STAGE' || !match.group) continue;
    if (match.status !== 'FINISHED' && match.status !== 'IN_PLAY') continue;
    if (match.homeScore === null || match.awayScore === null) continue;

    const home = groups[match.group]?.[match.homeTeam];
    const away = groups[match.group]?.[match.awayTeam];
    if (!home || !away) continue;

    home.played++; away.played++;
    home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won++; home.points += 3; away.lost++;
    } else if (match.homeScore < match.awayScore) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }
  }

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([g, teams]) => [
      g,
      Object.values(teams).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gd = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        if (gd !== 0) return gd;
        return b.goalsFor - a.goalsFor;
      }),
    ])
  );
}

export default function MatchesPage() {
  const [tab, setTab] = useState<TabValue>('SCHEDULED');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { user } = useAuthStore();

  const isGroupsView = tab === 'GRUPOS';
  const statusParam = !isGroupsView && tab !== 'ALL' ? (tab as MatchStatus) : undefined;

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', isGroupsView ? 'ALL' : tab],
    queryFn: () => getMatches(statusParam),
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

  const shouldGroupByDate = tab === 'SCHEDULED';

  const matchesToGroup = shouldGroupByDate
    ? [...accessibleMatches].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
    : accessibleMatches;

  const grouped = matchesToGroup.reduce<Record<string, Match[]>>((acc, m) => {
    const key = shouldGroupByDate
      ? format(new Date(m.matchDate), 'yyyy-MM-dd')
      : (m.group ?? m.stage);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const groupEntries = shouldGroupByDate
    ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
    : Object.entries(grouped);

  const standings = isGroupsView ? computeGroupStandings(matches) : {};

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

      {isGroupsView ? (
        isLoading ? (
          <div className="text-center py-16 text-slate-500">Cargando posiciones...</div>
        ) : (
          <GroupStandingsView standings={standings} />
        )
      ) : isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando partidos...</div>
      ) : accessibleMatches.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No hay partidos en esta categoría</div>
      ) : (
        groupEntries.map(([group, groupMatches]) => (
          <section key={group}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
              {shouldGroupByDate ? formatDateSectionLabel(group) : formatSectionLabel(group)}
            </h2>
            <div className="space-y-3">
              {groupMatches.map((match) => {
                const bet = betsByMatchId[match.id];
                const minutesToMatch = (new Date(match.matchDate).getTime() - Date.now()) / 60000;
                const canBet = match.status === 'SCHEDULED' && minutesToMatch > 30;
                const closingSoon = match.status === 'SCHEDULED' && minutesToMatch <= 60 && minutesToMatch > 30;
                const isLive = match.status === 'IN_PLAY';

                return (
                  <div
                    key={match.id}
                    className={`rounded-xl p-4 transition cursor-pointer ${
                      isLive
                        ? 'bg-green-900/15 border border-green-500/50 hover:border-green-400/60 shadow-[0_0_16px_rgba(34,197,94,0.12)]'
                        : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50'
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    {isLive && (
                      <div className="flex justify-center mb-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-900/40 border border-green-500/30 rounded-full px-3 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          EN VIVO
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-center">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{match.homeTeam}</p>
                          </div>

                          <div className="flex-shrink-0 text-center">
                            {match.status === 'FINISHED' || isLive ? (
                              <div className={`rounded-lg px-3 py-1.5 min-w-[64px] ${
                                isLive
                                  ? 'bg-green-900/50 border border-green-500/40'
                                  : 'bg-slate-700/50'
                              }`}>
                                <p className={`font-bold text-xl tabular-nums ${isLive ? 'text-green-300' : 'text-white'}`}>
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

                        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                          {shouldGroupByDate && match.group && (
                            <span className="text-xs text-slate-500 bg-slate-700/40 rounded-full px-2 py-0.5">
                              {formatSectionLabel(match.group)}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {match.status === 'SCHEDULED'
                              ? `${format(new Date(match.matchDate), 'dd MMM', { locale: es })} · En ${formatDistanceToNow(new Date(match.matchDate), { locale: es })}`
                              : format(new Date(match.matchDate), 'dd MMM HH:mm', { locale: es })}
                          </span>
                          {!isLive && <StatusBadge status={match.status} />}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {bet ? (
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Tu apuesta</p>
                            <p className="text-sm font-bold text-white">{bet.homeScore} - {bet.awayScore}</p>
                            {match.status === 'FINISHED' && <PointsBadge points={bet.points} />}
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

function GroupStandingsView({ standings }: { standings: Record<string, TeamStanding[]> }) {
  const entries = Object.entries(standings);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        Las posiciones estarán disponibles cuando haya partidos finalizados
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {entries.map(([group, teams]) => {
        const groupLabel = group.replace('Group_', 'Grupo ');
        return (
          <div key={group} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{groupLabel}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700/30">
                    <th className="text-left pl-4 pr-2 py-2 font-medium w-6">#</th>
                    <th className="text-left px-2 py-2 font-medium">Equipo</th>
                    <th className="text-center px-2 py-2 font-medium w-8">PJ</th>
                    <th className="text-center px-2 py-2 font-medium w-8">G</th>
                    <th className="text-center px-2 py-2 font-medium w-8">E</th>
                    <th className="text-center px-2 py-2 font-medium w-8">P</th>
                    <th className="text-center px-2 py-2 font-medium w-10 hidden sm:table-cell">GF</th>
                    <th className="text-center px-2 py-2 font-medium w-10 hidden sm:table-cell">GC</th>
                    <th className="text-center px-2 py-2 font-medium w-10">+/-</th>
                    <th className="text-center px-3 py-2 font-medium w-10 text-slate-300">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, i) => {
                    const diff = team.goalsFor - team.goalsAgainst;
                    const qualifies = i < 2;
                    return (
                      <tr
                        key={team.team}
                        className={`border-b border-slate-700/20 last:border-0 ${qualifies ? 'bg-green-900/5' : ''}`}
                      >
                        <td className="pl-4 pr-2 py-2.5">
                          <span className={`text-xs font-bold ${qualifies ? 'text-green-400' : 'text-slate-500'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-white font-medium">{team.team}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300">{team.played}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300">{team.won}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300">{team.drawn}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300">{team.lost}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300 hidden sm:table-cell">{team.goalsFor}</td>
                        <td className="text-center px-2 py-2.5 text-slate-300 hidden sm:table-cell">{team.goalsAgainst}</td>
                        <td className={`text-center px-2 py-2.5 font-medium ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-white">{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-700/30 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-900/50 border border-green-500/40 flex-shrink-0" />
              <span className="text-xs text-slate-500">Clasifican a eliminatoria</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDateSectionLabel(dateKey: string): string {
  const d = parseISO(dateKey);
  if (isToday(d)) return `Hoy · ${format(d, "d 'de' MMM", { locale: es })}`;
  if (isTomorrow(d)) return `Mañana · ${format(d, "d 'de' MMM", { locale: es })}`;
  return format(d, "EEEE d 'de' MMM", { locale: es });
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
