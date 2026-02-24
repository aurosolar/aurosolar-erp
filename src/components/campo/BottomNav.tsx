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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1A2E4A] border-t border-white/[0.06] flex z-50 pb-[env(safe-area-inset-bottom,4px)]">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        if (tab.fab) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex items-center justify-center -mt-4"
            >
              <div className="w-14 h-14 rounded-full bg-[#F5820A] shadow-lg shadow-[#F5820A]/40 flex items-center justify-center text-2xl active:scale-95 transition-transform">
                {tab.icon}
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors
              ${isActive ? 'text-[#F5820A]' : 'text-white/30'}`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
