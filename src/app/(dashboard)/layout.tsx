// src/app/(dashboard)/layout.tsx
// Layout autenticado: sidebar + topbar + contenido
// Se aplica a todas las rutas dentro de (dashboard)
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-auro-bg flex">
      <Sidebar usuario={session} />
      <div className="flex-1 lg:ml-[250px] flex flex-col min-h-screen">
        <Topbar usuario={session} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
