'use client';
import { useQuery } from '@tanstack/react-query';
import { getPrizes } from '@/lib/api';

const POSITION_ICONS = ['🥇', '🥈', '🥉', '🎖️'];
const POSITION_STYLES = [
  'from-yellow-900/40 to-yellow-800/20 border-yellow-600/40',
  'from-slate-700/40 to-slate-600/20 border-slate-500/40',
  'from-amber-900/40 to-amber-800/20 border-amber-700/40',
  'from-slate-800/40 to-slate-700/20 border-slate-600/30',
];

export default function PrizesPage() {
  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ['prizes'],
    queryFn: getPrizes,
  });

  const sorted = [...prizes].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🎁 Premios</h1>
        <p className="text-slate-400 text-sm mt-1">Premios para los mejores jugadores del prode</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando premios...</div>
      ) : prizes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎁</div>
          <p className="text-slate-400">Los premios serán anunciados próximamente</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((prize) => {
            const idx = prize.position - 1;
            const icon = POSITION_ICONS[idx] ?? '🏅';
            const style = POSITION_STYLES[idx] ?? POSITION_STYLES[3];

            return (
              <div key={prize.id} className={`bg-gradient-to-br ${style} border rounded-2xl p-6`}>
                <div className="text-4xl mb-3">{icon}</div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">
                  Puesto {prize.position}
                </p>
                <h3 className="text-lg font-bold text-white mb-1">{prize.name}</h3>
                <p className="text-2xl font-black text-white mb-4">{prize.description}</p>

                {prize.awardedTo ? (
                  <div className="bg-black/20 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">🏆 Ganador</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                        {prize.awardedTo.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{prize.awardedTo.name}</p>
                        <p className="text-slate-400 text-xs">{prize.awardedTo.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-xl">⏳</span>
                    <p className="text-slate-400 text-sm">Pendiente de asignación</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300 mb-2">¿Cómo ganar?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Acumula la mayor cantidad de puntos apostando resultados de partidos</li>
          <li><strong className="text-white">3 pts</strong>: marcador exacto (ej: 2-1 vs 2-1)</li>
          <li><strong className="text-white">1 pt</strong>: solo el resultado correcto (ej: 2-1 vs 3-0, ambos gana local)</li>
          <li>En caso de empate, gana quien tenga más marcadores exactos</li>
        </ul>
      </div>
    </div>
  );
}
