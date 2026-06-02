'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { clearToken } from '@/lib/auth';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/matches', label: 'Partidos', icon: '⚽' },
  { href: '/bets', label: 'Mis Apuestas', icon: '🎯' },
  { href: '/ranking', label: 'Ranking', icon: '🏆' },
  { href: '/prizes', label: 'Premios', icon: '🎁' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearToken();
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-slate-900/95 backdrop-blur border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white text-lg">
            <span className="text-2xl">⚽</span>
            <span className="hidden sm:block">Mundial FIFA <span className="text-green-400">2026</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                    ? 'bg-green-600/20 text-green-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {isAdmin() && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin'
                    ? 'bg-yellow-600/20 text-yellow-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                <span>⚙️</span> Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-600/30 flex items-center justify-center text-green-400 font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-slate-300 text-sm">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1 text-slate-400 hover:text-red-400 text-sm transition-colors px-2 py-1"
            >
              🚪 Salir
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-slate-300 hover:text-white p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-slate-700/50 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                    ? 'bg-green-600/20 text-green-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {isAdmin() && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50">
                <span>⚙️</span> Admin
              </Link>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-red-400 text-sm w-full">
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
