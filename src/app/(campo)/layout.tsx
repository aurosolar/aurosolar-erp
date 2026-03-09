// src/app/(campo)/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { BottomNav } from '@/components/campo/BottomNav';

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['INSTALADOR', 'JEFE_INSTALACIONES'].includes(session.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-lg shadow-sm shadow-emerald-600/20">
              ☀️
            </div>
            <div>
              <div className="text-[14px] font-extrabold leading-tight text-slate-800">
                Auro <span className="text-emerald-600">Solar</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Campo</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-1">
              <div className="text-[10px] text-slate-400">
                {new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes'}
              </div>
              <div className="text-xs font-bold text-slate-700">{session.nombre}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
              {session.nombre?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 pb-24">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
