// src/app/(dashboard)/layout.tsx
// Layout Stitch: TopNav horizontal + contenido full-width
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { TopNav } from '@/components/layout/TopNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav usuario={session} />
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
