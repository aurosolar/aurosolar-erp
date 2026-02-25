// src/components/layout/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
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

interface NavItem {
  href: string;
  icon: string;
  text: string;
  roles: string[];
}

interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    label: 'Comercial',
    icon: '💼',
    items: [
      { href: '/crm', icon: '📊', text: 'Pipeline', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/contactos', icon: '👤', text: 'Contactos', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/tareas-crm', icon: '✅', text: 'Mis Tareas', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/comerciales', icon: '🏆', text: 'Ranking', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/comisiones', icon: '💶', text: 'Comisiones', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Operaciones',
    icon: '🏗️',
    items: [
      { href: '/obras', icon: '🏗️', text: 'Obras', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'COMERCIAL', 'ADMINISTRACION'] },
      { href: '/planificacion', icon: '📅', text: 'Planificación', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/materiales', icon: '📦', text: 'Material', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/legalizacion', icon: '📋', text: 'Legalización', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/incidencias', icon: '⚠️', text: 'Incidencias', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/activos', icon: '🔋', text: 'Activos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/subvenciones', icon: '🏛️', text: 'Subvenciones', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Financiero',
    icon: '💰',
    items: [
      { href: '/cobros', icon: '💰', text: 'Cobros', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/rentabilidad', icon: '📈', text: 'Rentabilidad', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Clientes',
    icon: '👥',
    items: [
      { href: '/clientes', icon: '👥', text: 'Clientes', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'] },
      { href: '/documentos', icon: '📁', text: 'Documentos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Campo',
    icon: '🔧',
    items: [
      { href: '/campo', icon: '📍', text: 'Check-in/out', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/gastos', icon: '🧾', text: 'Gastos', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/validar-avanzado', icon: '✅', text: 'Validación', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
    ],
  },
  {
    label: 'Admin',
    icon: '⚙️',
    items: [
      { href: '/dashboard', icon: '📊', text: 'Dashboard', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/usuarios', icon: '👥', text: 'Usuarios', roles: ['ADMIN'] },
      { href: '/auditoria', icon: '📜', text: 'Auditoría', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/exportar', icon: '📥', text: 'Exportar / GDPR', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/configuracion', icon: '⚙️', text: 'Configuración', roles: ['ADMIN', 'DIRECCION'] },
 { href: '/branding', icon: '🎨', text: 'Branding', roles: ['ADMIN'] },    
],
  },
];

export function Sidebar({ usuario }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const iniciales = `${usuario.nombre[0]}${(usuario.apellidos || '')[0] || ''}`.toUpperCase();

  const rolLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    JEFE_INSTALACIONES: 'Jefe Instalaciones',
    INSTALADOR: 'Instalador',
    ADMINISTRACION: 'Administración',
  };

  // Auto-expand section with active page, collapse others
  useEffect(() => {
    const newCollapsed: Record<string, boolean> = {};
    NAV_ITEMS.forEach((group) => {
      const isActive = group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      newCollapsed[group.label] = !isActive;
    });
    setCollapsed(newCollapsed);
  }, []);

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
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
        className={`fixed top-0 left-0 bottom-0 w-[250px] bg-auro-navy z-[100] flex flex-col transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-auro-orange flex items-center justify-center text-lg shadow-md shadow-auro-orange/30">
              ☀️
            </div>
            <div>
              <div className="text-white text-[15px] font-extrabold leading-tight">
                Auro <span className="text-auro-orange">Solar</span>
              </div>
              <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider">
                Energía · ERP
              </div>
            </div>
          </div>
        </div>

        {/* Info usuario */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-auro-orange/20 text-auro-orange flex items-center justify-center text-[11px] font-bold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-[13px] font-bold truncate">
              {usuario.nombre} {usuario.apellidos}
            </div>
            <div className="text-white/40 text-[10px] font-medium">
              {rolLabel[usuario.rol] || usuario.rol}
            </div>
          </div>
        </div>

        {/* Navegación colapsable */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_ITEMS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(usuario.rol)
            );
            if (visibleItems.length === 0) return null;

            const isCollapsed = collapsed[group.label] ?? false;
            const hasActive = visibleItems.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + '/')
            );

            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleSection(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-[0.08em] transition-colors
                    ${hasActive ? 'text-auro-orange/80' : 'text-white/30 hover:text-white/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{group.icon}</span>
                    {group.label}
                  </div>
                  <span className={`text-[8px] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                    ▶
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-200 ease-out ${
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                  }`}
                >
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-[7px] ml-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150 mb-[1px]
                          ${isActive
                            ? 'bg-white/[0.1] text-white'
                            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
                          }`}
                      >
                        <span className="text-sm w-5 text-center">{item.icon}</span>
                        {item.text}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-estado-green animate-pulse" />
          <span className="text-white/25 text-[10px] font-medium">
            v2.0 · ERP Auro Solar
          </span>
        </div>
      </aside>
    </>
  );
}
