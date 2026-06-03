'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';
import { saveToken } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import type { Prize } from '@/types';

const POSITION_ICONS = ['🥇', '🥈', '🥉', '🎖️'];
const POSITION_COLORS = [
  'text-yellow-400',
  'text-slate-300',
  'text-orange-400',
  'text-slate-400',
];

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    fetch(`${base}/prizes`, { headers: { Accept: 'application/json' } })
      .then((r) => {
        const ct = r.headers.get('content-type') ?? '';
        if (!r.ok || !ct.includes('application/json')) return [];
        return r.json();
      })
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data as Prize[] : [];
        setPrizes([...list].sort((a, b) => a.position - b.position));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await login(email, password);
      saveToken(access_token);
      setToken(access_token);
      router.push('/dashboard');
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-start">

      {/* Panel izquierdo: info del torneo */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className="text-center lg:text-left">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-3xl font-bold text-white">Prode Mundial 2026</h1>
          <p className="text-green-400 mt-1 text-sm">Demuestra que sabes de fútbol</p>
        </div>

        {/* Bases de inscripción */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📋</span> Bases de inscripción
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-700/40 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium text-sm">Fase de Grupos</p>
                <p className="text-slate-400 text-xs mt-0.5">Pronósticos partidos de grupos</p>
              </div>
              <span className="text-green-400 font-bold text-lg whitespace-nowrap">$10.000</span>
            </div>
            <div className="flex items-center justify-between bg-slate-700/40 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium text-sm">Últimas Fases</p>
                <p className="text-slate-400 text-xs mt-0.5">Octavos, cuartos, semis y final</p>
              </div>
              <span className="text-green-400 font-bold text-lg whitespace-nowrap">$8.000</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-4 leading-relaxed">
            Puedes participar en una o ambas fases. El pago se realiza antes del inicio de cada etapa.
          </p>
        </div>

        {/* Premios */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span> Premios
          </h2>
          {prizes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-2">
              Los premios serán anunciados próximamente
            </p>
          ) : prizes.some((p) => p.fase) ? (
            <div className="grid grid-cols-2 gap-4">
              {(['GRUPOS', 'ELIMINATORIA'] as const).map((fase) => {
                const faseLabel = fase === 'GRUPOS' ? 'Fase de Grupos' : 'Fase Eliminatoria';
                const fasePrizes = prizes.filter((p) => p.fase === fase);
                if (fasePrizes.length === 0) return null;
                return (
                  <div key={fase}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700/50 pb-1">{faseLabel}</p>
                    <div className="space-y-2">
                      {fasePrizes.map((prize) => {
                        const idx = prize.position - 1;
                        const icon = POSITION_ICONS[idx] ?? '🏅';
                        const color = POSITION_COLORS[idx] ?? POSITION_COLORS[3];
                        return (
                          <div key={prize.id} className="bg-slate-700/40 rounded-xl p-3 flex flex-col gap-1">
                            <span className="text-2xl">{icon}</span>
                            <p className="text-white font-medium text-xs leading-tight">{prize.name}</p>
                            <span className={`${color} font-bold text-base`}>{prize.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {prizes.map((prize) => {
                const idx = prize.position - 1;
                const icon = POSITION_ICONS[idx] ?? '🏅';
                const color = POSITION_COLORS[idx] ?? POSITION_COLORS[3];
                return (
                  <div key={prize.id} className="flex items-center justify-between bg-slate-700/40 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <p className="text-white font-medium text-sm">{prize.name}</p>
                    </div>
                    <span className={`${color} font-bold text-sm text-right`}>{prize.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: formulario de login */}
      <div className="w-full lg:w-1/2">
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            ¿No tenes cuenta?{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300 font-medium">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
