// src/app/(portal)/layout.tsx
'use client';

import { useSession } from '@/lib/useSession';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/portal', icon: '🏠', label: 'Inicio' },
  { href: '/portal/obras', icon: '🏗️', label: 'Mis obras' },
  { href: '/portal/soporte', icon: '💬', label: 'Soporte' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!usuario || usuario.rol !== 'CLIENTE')) {
      router.push('/login');
    }
  }, [usuario, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-[#FAFBFD]">
      {/* Header */}
      <header className="bg-white border-b border-auro-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <span className="text-sm font-extrabold text-auro-navy">Auro Solar</span>
            <span className="text-[9px] font-bold text-auro-orange bg-auro-orange/10 px-1.5 py-0.5 rounded-md uppercase">Portal cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-auro-navy/40">{usuario.nombre}</span>
            <Link href="/api/auth/logout" className="text-xs text-auro-navy/30 hover:text-estado-red">Salir</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-auro-border z-40">
        <div className="max-w-3xl mx-auto flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-bold transition-colors
                  ${active ? 'text-auro-orange' : 'text-auro-navy/30'}`}>
                <span className="text-lg mb-0.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
