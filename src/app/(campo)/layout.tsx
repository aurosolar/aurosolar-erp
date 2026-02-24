// src/app/(campo)/layout.tsx
// Layout para instaladores en campo — dark theme, bottom nav, sin sidebar
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { BottomNav } from '@/components/campo/BottomNav';

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Solo instaladores y jefes de instalaciones usan esta vista
  if (!['INSTALADOR', 'JEFE_INSTALACIONES'].includes(session.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0F1C2E] text-[#F0F4F8] font-outfit">
      {/* Header fijo */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#1A2E4A] to-[#162640] border-b border-white/[0.06] px-5 pt-4 pb-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-[#F5820A] flex items-center justify-center text-lg shadow-md shadow-[#F5820A]/30">
              ☀️
            </div>
            <div>
              <div className="text-[15px] font-extrabold leading-tight">
                Auro <span className="text-[#F5820A]">Solar</span>
              </div>
            </div>
          </div>
          <button className="w-10 h-10 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center text-lg relative">
            🔔
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#DC2626] border-2 border-[#1A2E4A]" />
          </button>
        </div>

        {/* Saludo */}
        <div className="mb-3">
          <div className="text-[13px] text-white/40 font-medium">
            {new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes'} 👷
          </div>
          <div className="text-[22px] font-extrabold leading-tight">
            {session.nombre}
          </div>
        </div>

        {/* Tarjeta jornada — se hidrata en cliente */}
        <div id="jornada-card" className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-3.5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-xl shrink-0">
            ☕
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">Sin jornada activa</div>
            <div className="text-xs text-white/40 mt-0.5">Haz check-in en una obra para empezar</div>
          </div>
        </div>
      </header>

      {/* Contenido con padding para bottom nav */}
      <main className="px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
