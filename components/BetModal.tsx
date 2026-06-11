'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrUpdateBet, deleteBet } from '@/lib/api';
import type { Match, Bet } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StageBadge from '@/components/StageBadge';

interface Props {
  match: Match;
  existingBet?: Bet;
  onClose: () => void;
}

export default function BetModal({ match, existingBet, onClose }: Props) {
  const qc = useQueryClient();
  const [home, setHome] = useState(existingBet?.homeScore ?? 0);
  const [away, setAway] = useState(existingBet?.awayScore ?? 0);
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => createOrUpdateBet(match.id, home, away),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets-me'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al guardar la apuesta');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBet(existingBet!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets-me'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      onClose();
    },
  });

  const minutesToMatch = (new Date(match.matchDate).getTime() - Date.now()) / 60000;
  const canBet = match.status === 'SCHEDULED' && minutesToMatch > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {existingBet ? 'Editar apuesta' : 'Hacer apuesta'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="bg-slate-700/40 rounded-xl p-4 mb-5 text-center">
          <div className="flex justify-center mb-1">
            <StageBadge stage={match.stage} group={match.group} />
          </div>
          <div className="flex items-center justify-center gap-4 my-3">
            <span className="text-lg font-bold text-white">{match.homeTeam}</span>
            <span className="text-slate-500 text-sm font-medium">vs</span>
            <span className="text-lg font-bold text-white">{match.awayTeam}</span>
          </div>
          <p className="text-xs text-slate-400">
            {format(new Date(match.matchDate), "EEEE dd 'de' MMMM · HH:mm", { locale: es })}
          </p>
          {!canBet && (
            <p className="mt-2 text-xs text-red-400 font-medium">
              {match.status !== 'SCHEDULED'
                ? '🔒 Apuestas cerradas'
                : '🔒 Las apuestas cierran 30 min antes del inicio'}
            </p>
          )}
          {canBet && minutesToMatch < 60 && (
            <p className="mt-2 text-xs text-yellow-400">⚠️ Cierra en {Math.round(minutesToMatch)} min · las apuestas cierran 30 min antes del inicio</p>
          )}
        </div>

        {canBet && (
          <>
            <div className="flex items-center justify-center gap-6 mb-5">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-2">{match.homeTeam}</p>
                <ScoreInput value={home} onChange={setHome} />
              </div>
              <span className="text-2xl text-slate-500 font-bold mt-4">:</span>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-2">{match.awayTeam}</p>
                <ScoreInput value={away} onChange={setAway} />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg px-4 py-2 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              {existingBet && (
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition"
              >
                {saveMutation.isPending ? 'Guardando...' : existingBet ? 'Actualizar' : 'Confirmar apuesta'}
              </button>
            </div>
          </>
        )}

        {!canBet && existingBet && (
          <div className="bg-slate-700/40 rounded-xl p-4 text-center">
            <p className="text-slate-300 text-sm">Tu apuesta: <span className="font-bold text-white">{existingBet.homeScore} - {existingBet.awayScore}</span></p>
            {match.status === 'FINISHED' && (
              <p className="text-slate-400 text-xs mt-1">
                Resultado: {match.homeScore} - {match.awayScore}
                {' · '}
                <PointsLabel points={existingBet.points} />
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 text-white font-bold transition"
      >−</button>
      <span className="w-10 text-center text-2xl font-bold text-white">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 text-white font-bold transition"
      >+</button>
    </div>
  );
}

function PointsLabel({ points }: { points: number }) {
  if (points === 3) return <span className="text-green-400 font-bold">+3 pts ⭐</span>;
  if (points === 1) return <span className="text-yellow-400 font-bold">+1 pt</span>;
  return <span className="text-red-400">0 pts</span>;
}
