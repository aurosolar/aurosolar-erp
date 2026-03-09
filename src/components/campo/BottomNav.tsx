// src/components/campo/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/campo', icon: '🏠', label: 'Inicio' },
  { href: '/campo/obras', icon: '🏗️', label: 'Obras' },
  { href: '/campo/checkin', icon: '📍', label: '', fab: true },
  { href: '/campo/historial', icon: '📋', label: 'Historial' },
  { href: '/campo/perfil', icon: '👤', label: 'Perfil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50 pb-[env(safe-area-inset-bottom,4px)]">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/campo' && pathname.startsWith(tab.href));

        if (tab.fab) {
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex items-center justify-center -mt-4">
              <div className="w-14 h-14 rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 flex items-center justify-center text-2xl active:scale-95 transition-transform border-4 border-white">
                {tab.icon}
              </div>
            </Link>
          );
        }

        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-400'
            }`}>
            <span className="text-lg">{tab.icon}</span>
            <span className={`text-[9px] font-semibold mt-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
