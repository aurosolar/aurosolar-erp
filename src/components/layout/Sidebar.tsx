// src/components/layout/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Rol } from '@prisma/client';

interface Props {
  usuario: {
    nombre: string;
    apellidos: string;
    rol: Rol;
  };
}

const NAV_ITEMS = [
  { label: 'General', items: [
    { href: '/dashboard', icon: '📊', text: 'Dashboard', roles: ['ADMIN','DIRECCION'] },
    { href: '/obras', icon: '🏗️', text: 'Obras', roles: ['ADMIN','DIRECCION','JEFE_INSTALACIONES','COMERCIAL','ADMINISTRACION'] },
    { href: '/cobros', icon: '💰', text: 'Cobros', roles: ['ADMIN','DIRECCION','ADMINISTRACION'] },
  ]},
  { label: 'Operaciones', items: [
    { href: '/planificacion', icon: '📅', text: 'Planificación', roles: ['ADMIN','DIRECCION','JEFE_INSTALACIONES'] },
    { href: '/incidencias', icon: '⚠️', text: 'Incidencias', roles: ['ADMIN','DIRECCION','JEFE_INSTALACIONES','ADMINISTRACION'] },
    { href: '/legalizacion', icon: '📋', text: 'Legalización', roles: ['ADMIN','DIRECCION','ADMINISTRACION'] },
    { href: '/materiales', icon: '📦', text: 'Material', roles: ['ADMIN','DIRECCION','JEFE_INSTALACIONES'] },
  ]},
  { label: 'Análisis', items: [
    { href: '/rentabilidad', icon: '📈', text: 'Rentabilidad', roles: ['ADMIN','DIRECCION'] },
    { href: '/comerciales', icon: '🏆', text: 'Comerciales', roles: ['ADMIN','DIRECCION'] },
  ]},
  { label: 'Sistema', items: [
    { href: '/usuarios', icon: '👥', text: 'Usuarios', roles: ['ADMIN'] },
    { href: '/configuracion', icon: '⚙️', text: 'Configuración', roles: ['ADMIN','DIRECCION'] },
  ]},
];

export function Sidebar({ usuario }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const iniciales = `${usuario.nombre[0]}${usuario.apellidos[0] || ''}`.toUpperCase();

  const rolLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    JEFE_INSTALACIONES: 'Jefe Instalaciones',
    INSTALADOR: 'Instalador',
    ADMINISTRACION: 'Administración',
  };

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-auro-navy text-white rounded-xl flex items-center justify-center text-lg shadow-lg"
      >
        ☰
      </button>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/45 z-[99]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[236px] bg-auro-navy z-[100] flex flex-col overflow-y-auto transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-auro-orange flex items-center justify-center text-lg shadow-md shadow-auro-orange/30">
              ☀️
            </div>
            <div>
              <div className="text-white text-[15px] font-extrabold leading-tight">
                Auro <span className="text-auro-orange">Solar</span>
              </div>
              <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider">
                Energía
              </div>
            </div>
          </div>
        </div>

        {/* Info usuario */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-auro-orange/20 text-auro-orange flex items-center justify-center text-xs font-bold">
            {iniciales}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-bold truncate">
              {usuario.nombre} {usuario.apellidos}
            </div>
            <div className="text-white/40 text-[11px] font-medium">
              {rolLabel[usuario.rol] || usuario.rol}
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-3 px-3">
          {NAV_ITEMS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(usuario.rol)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-2">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/25">
                  {group.label}
                </div>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-150 mb-0.5
                        ${isActive
                          ? 'bg-white/[0.1] text-white'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                        }`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.text}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.08] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-estado-green animate-pulse" />
          <span className="text-white/30 text-[11px] font-medium">
            Sistema operativo · v1.0
          </span>
        </div>
      </aside>
    </>
  );
}
