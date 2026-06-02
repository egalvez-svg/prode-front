'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyBets } from '@/lib/api';
import BetModal from '@/components/BetModal';
import StageBadge from '@/components/StageBadge';
import type { Bet } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BetsPage() {
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const { data: bets = [], isLoading } = useQuery({
    queryKey: ['bets-me'],
    queryFn: getMyBets,
  });

  const stats = bets.reduce(
    (acc, b) => {
      acc.total++;
      if (b.match.status === 'FINISHED') {
        acc.finished++;
        acc.points += b.points;
        if (b.points === 3) acc.exact++;
        if (b.points === 1) acc.correct++;
      }
      return acc;
    },
    { total: 0, finished: 0, points: 0, exact: 0, correct: 0 }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">🎯 Mis Apuestas</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Puntos" value={stats.points} highlight />
        <MiniStat label="Exactas ⭐" value={stats.exact} />
        <MiniStat label="Correctas" value={stats.correct} />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando apuestas...</div>
      ) : bets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-slate-400">Aún no has hecho apuestas</p>
          <p className="text-slate-500 text-sm mt-1">Ve a Partidos para empezar a apostar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => {
            const isFinished = bet.match.status === 'FINISHED';
            const canEdit = bet.match.status === 'SCHEDULED' &&
              (new Date(bet.match.matchDate).getTime() - Date.now()) / 60000 > 30;

            return (
              <div
                key={bet.id}
                className={`bg-slate-800/50 border rounded-xl p-4 transition ${
                  canEdit ? 'border-slate-700/50 hover:border-green-700/40 cursor-pointer' : 'border-slate-700/30'
                }`}
                onClick={() => canEdit && setSelectedBet(bet)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <StageBadge stage={bet.match.stage} group={bet.match.group} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">
                        {bet.match.homeTeam} vs {bet.match.awayTeam}
                      </p>
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${
                        isFinished ? 'text-slate-400 bg-slate-700/30 border-slate-600/30' :
                        bet.match.status === 'IN_PLAY' ? 'text-green-400 bg-green-900/30 border-green-700/30' :
                        'text-blue-400 bg-blue-900/30 border-blue-700/30'
                      }`}>
                        {isFinished ? 'Finalizado' : bet.match.status === 'IN_PLAY' ? 'En juego' : 'Programado'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      {format(new Date(bet.match.matchDate), "EEEE dd 'de' MMMM yyyy · HH:mm", { locale: es })}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-3">
                      {isFinished && (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 mb-0.5">Resultado</p>
                          <p className="font-bold text-slate-300">{bet.match.homeScore} - {bet.match.awayScore}</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-0.5">Mi apuesta</p>
                        <p className="font-bold text-white">{bet.homeScore} - {bet.awayScore}</p>
                      </div>
                    </div>
                    {isFinished && (
                      <div className="mt-2 text-right">
                        {bet.points === 3 && <span className="text-sm text-green-400 font-bold">+3 pts ⭐ Exacto</span>}
                        {bet.points === 1 && <span className="text-sm text-yellow-400 font-bold">+1 pt Correcto</span>}
                        {bet.points === 0 && <span className="text-sm text-red-400">0 pts</span>}
                      </div>
                    )}
                    {canEdit && (
                      <p className="text-xs text-green-400 mt-1">Toca para editar →</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBet && (
        <BetModal
          match={selectedBet.match}
          existingBet={selectedBet}
          onClose={() => setSelectedBet(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
    </div>
  );
}
