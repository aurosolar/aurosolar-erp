// src/components/layout/Topbar.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Rol } from '@prisma/client';

import { NotificationBell } from '@/components/NotificationBell';

interface Props {
  usuario: {
    nombre: string;
    rol: Rol;
  };
}

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/obras': 'Obras',
  '/cobros': 'Cobros',
  '/planificacion': 'Planificación',
  '/incidencias': 'Incidencias',
  '/legalizacion': 'Legalización',
  '/materiales': 'Material',
  '/activos': 'Activos',
  '/crm': 'CRM',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuración',
  '/rentabilidad': 'Rentabilidad',
  '/comerciales': 'Comerciales',
};

export function Topbar({ usuario }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const title = TITLES[pathname] || 'Auro Solar';
  const now = new Date();
  const fecha = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="h-14 bg-white border-b border-auro-border flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-40">
      {/* Espaciador para hamburguesa en móvil */}
      <div className="w-10 lg:hidden" />

      {/* Título */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-auro-navy truncate">
          {title}
        </h1>
      </div>

      {/* Fecha */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-auro-navy/40 font-medium">
        <span>📅</span>
        <span>{fecha}</span>
      </div>

      {/* Notificaciones */}
      <NotificationBell />

      {/* Botón refrescar */}
      <button
        onClick={() => router.refresh()}
        className="w-8 h-8 rounded-lg bg-auro-surface-2 hover:bg-auro-surface-3 flex items-center justify-center text-sm transition-colors"
        title="Actualizar datos"
      >
        ↻
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="h-8 px-3 rounded-lg bg-auro-surface-2 hover:bg-estado-red/10 hover:text-estado-red text-xs font-semibold text-auro-navy/50 transition-colors"
      >
        Salir
      </button>
    </header>
  );
}
