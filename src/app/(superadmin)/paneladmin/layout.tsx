// src/app/(superadmin)/superadmin/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.rol !== 'SUPERADMIN') redirect('/dashboard');
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">S</div>
          <div>
            <div className="text-white font-bold text-sm">Instalyx SaaS</div>
            <div className="text-slate-400 text-xs">Panel de Superadministrador</div>
          </div>
        </div>
        <a href="/api/auth/logout" className="text-xs text-slate-400 hover:text-white transition-colors">Cerrar sesión</a>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
