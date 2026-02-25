// src/app/(campo)/layout.tsx
// Layout para instaladores en campo — dark theme, bottom nav, sin sidebar
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { BottomNav } from '@/components/campo/BottomNav';
import { CampoHeader } from '@/components/campo/CampoHeader';

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Solo instaladores y jefes de instalaciones usan esta vista
  if (!['INSTALADOR', 'JEFE_INSTALACIONES'].includes(session.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0F1C2E] text-[#F0F4F8] font-outfit">
      {/* Header con jornada reactiva (client component) */}
      <CampoHeader nombreUsuario={session.nombre || 'Instalador'} />

      {/* Contenido con padding para bottom nav */}
      <main className="px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
