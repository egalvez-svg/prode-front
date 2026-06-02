'use client';
import { useQuery } from '@tanstack/react-query';
import { getRankings, getMyRanking } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RankingPage() {
  const { user } = useAuthStore();
  const { data: rankings = [], isLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: getRankings,
    refetchInterval: 60_000,
  });
  const { data: myRank } = useQuery({
    queryKey: ['ranking-me'],
    queryFn: getMyRanking,
  });

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">🏆 Ranking</h1>

      {/* Mi posición */}
      {myRank && (
        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/20 border border-green-700/40 rounded-xl p-5">
          <p className="text-green-400 text-sm font-medium mb-2">Tu posición</p>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-black text-white">#{myRank.position}</div>
            <div>
              <p className="text-white font-semibold">{user?.name}</p>
              <div className="flex gap-4 mt-1 text-sm text-slate-300">
                <span><span className="text-green-400 font-bold">{myRank.totalPoints}</span> pts</span>
                <span><span className="text-yellow-400 font-bold">{myRank.exactScores}</span> exactas</span>
                <span><span className="text-slate-300 font-bold">{myRank.totalBets}</span> apuestas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando ranking...</div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">El ranking estará disponible cuando haya partidos finalizados</div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-center hidden sm:block">Apuestas</span>
            <span className="text-center hidden sm:block">Exactas ⭐</span>
            <span className="text-right font-bold">Puntos</span>
          </div>

          <div className="divide-y divide-slate-700/30">
            {rankings.map((entry) => {
              const isMe = entry.id === user?.id;
              const medal = medals[entry.position - 1];
              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-4 transition ${
                    isMe ? 'bg-green-900/20' : 'hover:bg-slate-700/20'
                  }`}
                >
                  <div className="w-8 text-center">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className={`text-sm font-bold ${isMe ? 'text-green-400' : 'text-slate-400'}`}>
                        {entry.position}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className={`font-medium ${isMe ? 'text-green-300' : 'text-white'}`}>
                      {entry.name} {isMe && <span className="text-xs text-green-500">(tú)</span>}
                    </p>
                    <p className="text-slate-500 text-xs hidden sm:block">{entry.email}</p>
                  </div>

                  <div className="text-center text-sm text-slate-400 hidden sm:block">
                    {entry.totalBets}
                  </div>

                  <div className="text-center text-sm hidden sm:block">
                    <span className="text-yellow-400 font-medium">{entry.exactScores}</span>
                  </div>

                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      entry.position === 1 ? 'text-yellow-400' :
                      entry.position === 2 ? 'text-slate-300' :
                      entry.position === 3 ? 'text-amber-600' :
                      isMe ? 'text-green-400' : 'text-white'
                    }`}>
                      {entry.totalPoints}
                    </span>
                    <span className="text-slate-500 text-xs ml-1">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desempate info */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300 mb-1">Criterio de desempate</p>
        <p>A igual puntaje, gana quien tiene más marcadores exactos (⭐).</p>
      </div>
    </div>
  );
}
