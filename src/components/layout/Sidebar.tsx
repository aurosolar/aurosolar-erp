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
    icon: '\ud83d\udcbc',
    items: [
      { href: '/crm', icon: '\ud83d\udcca', text: 'Pipeline', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/contactos', icon: '\ud83d\udc64', text: 'Contactos', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/tareas-crm', icon: '\u2705', text: 'Mis Tareas', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/comerciales', icon: '\ud83c\udfc6', text: 'Ranking', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/comisiones', icon: '\ud83d\udcb6', text: 'Comisiones', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Operaciones',
    icon: '\ud83c\udfd7\ufe0f',
    items: [
      { href: '/obras', icon: '\ud83c\udfd7\ufe0f', text: 'Obras', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'COMERCIAL', 'ADMINISTRACION'] },
      { href: '/planificacion', icon: '\ud83d\udcc5', text: 'Planificaci\u00f3n', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/materiales', icon: '\ud83d\udce6', text: 'Material', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/legalizacion', icon: '\ud83d\udccb', text: 'Legalizaci\u00f3n', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/incidencias', icon: '\u26a0\ufe0f', text: 'Incidencias', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/activos', icon: '\ud83d\udd0b', text: 'Activos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/subvenciones', icon: '\ud83c\udfdb\ufe0f', text: 'Subvenciones', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Financiero',
    icon: '\ud83d\udcb0',
    items: [
      { href: '/cobros', icon: '\ud83d\udcb0', text: 'Cobros', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/rentabilidad', icon: '\ud83d\udcc8', text: 'Rentabilidad', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Clientes',
    icon: '\ud83d\udc65',
    items: [
      { href: '/clientes', icon: '\ud83d\udc65', text: 'Clientes', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'] },
      { href: '/documentos', icon: '\ud83d\udcc1', text: 'Documentos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Campo',
    icon: '\ud83d\udd27',
    items: [
      { href: '/campo', icon: '\ud83d\udccd', text: 'Check-in/out', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/gastos', icon: '\ud83e\uddfe', text: 'Gastos', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/validar-avanzado', icon: '\u2705', text: 'Validaci\u00f3n', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
    ],
  },
  {
    label: 'Admin',
    icon: '\u2699\ufe0f',
    items: [
      { href: '/dashboard', icon: '\ud83d\udcca', text: 'Dashboard', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/usuarios', icon: '\ud83d\udc65', text: 'Usuarios', roles: ['ADMIN'] },
      { href: '/auditoria', icon: '\ud83d\udcdc', text: 'Auditor\u00eda', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/exportar', icon: '\ud83d\udce5', text: 'Exportar / GDPR', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/configuracion', icon: '\u2699\ufe0f', text: 'Configuraci\u00f3n', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/branding', icon: '\ud83c\udfa8', text: 'Branding', roles: ['ADMIN'] },
    ],
  },
];

function useBranding() {
  const [brand, setBrand] = useState<any>(null);
  useEffect(() => {
    fetch('/api/config-sistema')
      .then(r => r.json())
      .then(d => { if (d.ok) setBrand(d.data); })
      .catch(() => {});
  }, []);
  return brand;
}

export function Sidebar({ usuario }: Props) {
  const pathname = usePathname();
  const brand = useBranding();
  const branding = brand?.branding || {};
  const nombreEmpresa = branding.nombreEmpresa || brand?.nombreEmpresa || 'Auro Solar';
  const subtitulo = branding.subtitulo || 'Energ\u00eda \u00b7 ERP';
  const logoUrl = branding.logoUrl || null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const iniciales = `${usuario.nombre[0]}${(usuario.apellidos || '')[0] || ''}`.toUpperCase();

  const rolLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRECCION: 'Direcci\u00f3n',
    COMERCIAL: 'Comercial',
    JEFE_INSTALACIONES: 'Jefe Instalaciones',
    INSTALADOR: 'Instalador',
    ADMINISTRACION: 'Administraci\u00f3n',
  };

  useEffect(() => {
    const nc: Record<string, boolean> = {};
    NAV_ITEMS.forEach((g) => {
      const a = g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
      nc[g.label] = !a;
    });
    setCollapsed(nc);
  }, []);

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-auro-navy text-white rounded-xl flex items-center justify-center text-lg shadow-lg"
      >
        \u2630
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/45 z-[99]" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[250px] bg-auro-navy z-[100] flex flex-col transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-auro-orange flex items-center justify-center text-lg shadow-md shadow-auro-orange/30 overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : '\u2600\ufe0f'}
            </div>
            <div>
              <div className="text-white text-[15px] font-extrabold leading-tight">
                {nombreEmpresa.includes(' ')
                  ? <>{nombreEmpresa.split(' ')[0]} <span className="text-auro-orange">{nombreEmpresa.split(' ').slice(1).join(' ')}</span></>
                  : <span className="text-auro-orange">{nombreEmpresa}</span>
                }
              </div>
              <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider">
                {subtitulo}
              </div>
            </div>
          </div>
        </div>

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

        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_ITEMS.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(usuario.rol));
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsed[group.label] ?? false;
            const hasActive = visibleItems.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleSection(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-[0.08em] transition-colors ${hasActive ? 'text-auro-orange/80' : 'text-white/30 hover:text-white/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{group.icon}</span>
                    {group.label}
                  </div>
                  <span className={`text-[8px] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                    \u25b6
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-200 ease-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-[7px] ml-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150 mb-[1px] ${isActive ? 'bg-white/[0.1] text-white' : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'}`}
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

        <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-estado-green animate-pulse" />
          <span className="text-white/25 text-[10px] font-medium">
            v2.0 &middot; ERP {nombreEmpresa}
          </span>
        </div>
      </aside>
    </>
  );
}
