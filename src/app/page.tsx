// src/app/page.tsx
// Página raíz — redirige al dashboard o login según sesión
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Redirigir según rol
  switch (session.rol) {
    case 'SUPERADMIN':
      redirect('/superadmin');
    case 'INSTALADOR':
      redirect('/campo');
    case 'COMERCIAL':
      redirect('/crm');
    default:
      redirect('/dashboard');
  }
}
