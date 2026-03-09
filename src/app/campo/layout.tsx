// src/app/campo/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LogoutButtonCampo from './logout-button';

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['INSTALADOR', 'JEFE_INSTALACIONES'].includes(session.rol)) redirect('/dashboard');
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-lg mx-auto">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-xs">A</div>
          <div>
            <div className="text-white font-bold text-sm leading-none">Auro Solar</div>
            <div className="text-slate-500 text-[10px]">App de Campo</div>
          </div>
        </div>
        <LogoutButtonCampo nombre={session.nombre} />
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-slate-900 border-t border-slate-800 flex z-50">
        {[
          { href: '/campo', icon: '🏠', label: 'Hoy' },
          { href: '/campo/obras', icon: '🔧', label: 'Obras' },
          { href: '/campo/incidencia', icon: '⚠️', label: 'Incidencia' },
          { href: '/campo/perfil', icon: '👤', label: 'Perfil' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 text-slate-500 hover:text-green-400 transition-colors active:text-green-400">
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
