// src/components/layout/TopNav.tsx
// Stitch-style horizontal navigation
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Rol } from '@prisma/client';
import { NotificationBell } from '@/components/NotificationBell';

interface Props {
  usuario: {
    nombre: string;
    apellidos: string;
    rol: Rol;
  };
}

interface NavItem {
  href: string;
  label: string;
  roles: string[];
  children?: { href: string; label: string; icon: string; roles: string[] }[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'] },
  {
    href: '/obras', label: 'Operaciones', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'],
    children: [
      { href: '/obras', label: 'Obras', icon: '🏗️', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'COMERCIAL', 'ADMINISTRACION'] },
      { href: '/planificacion', label: 'Planificación', icon: '📅', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/materiales', label: 'Material', icon: '📦', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/legalizacion', label: 'Legalización', icon: '📋', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/incidencias', label: 'Incidencias', icon: '⚠️', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/activos', label: 'Activos', icon: '🔋', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/subvenciones', label: 'Subvenciones', icon: '🏛️', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
    ],
  },
  {
    href: '/crm', label: 'CRM', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'],
    children: [
      { href: '/crm', label: 'Pipeline', icon: '📊', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/contactos', label: 'Contactos', icon: '👤', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/tareas-crm', label: 'Mis Tareas', icon: '✅', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/comerciales', label: 'Ranking', icon: '🏆', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/comisiones', label: 'Comisiones', icon: '💶', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    href: '/cobros', label: 'Finanzas', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'],
    children: [
      { href: '/cobros', label: 'Cobros', icon: '💰', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/rentabilidad', label: 'Rentabilidad', icon: '📈', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  { href: '/clientes', label: 'Clientes', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'] },
];

const ADMIN_ITEMS = [
  { href: '/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/auditoria', label: 'Auditoría', icon: '🔍' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/branding', label: 'Branding', icon: '🎨' },
  { href: '/exportar', label: 'Exportar / GDPR', icon: '📤' },
];

export function TopNav({ usuario }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Close dropdowns on navigate
  useEffect(() => {
    setOpenDropdown(null);
    setShowUserMenu(false);
    setMobileOpen(false);
  }, [pathname]);

  const rol = usuario.rol as string;
  const filteredNav = NAV.filter(n => n.roles.includes(rol));
  const isAdmin = ['ADMIN', 'DIRECCION'].includes(rol);

  function isActive(href: string, children?: NavItem['children']) {
    if (pathname === href) return true;
    if (children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))) return true;
    return false;
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200" ref={dropdownRef}>
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">A</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-extrabold text-slate-800 tracking-tight">Auro Solar</span>
              <span className="text-[9px] text-slate-400 block -mt-0.5 uppercase tracking-widest">ERP</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {filteredNav.map(item => {
              const active = isActive(item.href, item.children);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <div key={item.href} className="relative">
                  {hasChildren ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === item.label ? null : item.label); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 ${
                        active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                      <svg className={`w-3 h-3 transition-transform ${openDropdown === item.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  ) : (
                    <Link href={item.href}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}

                  {/* Dropdown */}
                  {hasChildren && openDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50">
                      {item.children!.filter(c => c.roles.includes(rol)).map(child => (
                        <a key={child.href} href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors w-full ${
                            pathname === child.href || pathname.startsWith(child.href + '/')
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{child.icon}</span>
                          <span className="font-medium">{child.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right: Search + Notif + User */}
        <div className="flex items-center gap-2">
          {/* Search (placeholder) */}
          <div className="hidden md:flex items-center h-9 w-52 bg-slate-50 border border-slate-200 rounded-lg px-3 gap-2">
            <span className="text-slate-300 text-sm">🔍</span>
            <span className="text-xs text-slate-300">Buscar...</span>
          </div>

          <NotificationBell />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
              className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {usuario.nombre[0]}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-slate-700 block leading-tight">{usuario.nombre}</span>
                <span className="text-[9px] text-slate-400 block">{usuario.rol}</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-800">{usuario.nombre} {usuario.apellidos}</p>
                  <p className="text-[10px] text-slate-400">{usuario.rol}</p>
                </div>
                {isAdmin && (
                  <>
                    {ADMIN_ITEMS.map(item => (
                      <Link key={item.href} href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <span>{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                  <span>🚪</span>
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center">
            <span className="text-lg">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white max-h-[70vh] overflow-y-auto">
          <div className="p-3 space-y-1">
            {filteredNav.map(item => (
              <div key={item.href}>
                {item.children ? (
                  <>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-3 pt-3 pb-1">{item.label}</p>
                    {item.children.filter(c => c.roles.includes(rol)).map(child => (
                      <Link key={child.href} href={child.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          pathname === child.href ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        <span>{child.icon}</span> {child.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      pathname === item.href ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            {isAdmin && (
              <>
                <div className="border-t border-slate-100 my-2" />
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-3 pt-1 pb-1">Admin</p>
                {ADMIN_ITEMS.map(item => (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      pathname === item.href ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <span>{item.icon}</span> {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
