// src/app/(campo)/campo/perfil/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { useState, useEffect } from 'react';

interface EstadisticasInstalador {
  obrasAsignadas: number;
  checkinsHoy: number;
  incidenciasAbiertas: number;
}

export default function PerfilPage() {
  const router = useRouter();
  const { usuario, loading } = useSession();
  const [stats, setStats] = useState<EstadisticasInstalador | null>(null);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (usuario) {
      fetch(`/api/obras?instaladorId=${usuario.id}&limit=100`)
        .then(r => r.json())
        .then(obrasRes => {
          setStats({
            obrasAsignadas: obrasRes.ok ? (obrasRes.data?.obras?.length ?? 0) : 0,
            checkinsHoy: 0,
            incidenciasAbiertas: 0,
          });
        })
        .catch(() => setStats(null));
    }
  }, [usuario]);

  async function handleLogout() {
    setCerrando(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      setCerrando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#F5820A]/30 border-t-[#F5820A] rounded-full animate-spin" />
      </div>
    );
  }

  const iniciales = usuario
    ? `${usuario.nombre.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase()
    : '??';

  const rolLabel: Record<string, string> = {
    INSTALADOR: 'Instalador',
    JEFE_INSTALACIONES: 'Jefe de Instalaciones',
    ADMIN: 'Administrador',
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    ADMINISTRACION: 'Administración',
    CLIENTE: 'Cliente',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">👤 Mi perfil</h2>

      {/* Tarjeta de usuario */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F5820A]/15 border border-[#F5820A]/20 flex items-center justify-center text-xl font-extrabold text-[#F5820A]">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-extrabold leading-tight truncate">
              {usuario?.nombre} {usuario?.apellidos}
            </div>
            <div className="text-sm text-white/40 mt-0.5 truncate">
              {usuario?.email}
            </div>
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2563EB]/10 text-[#60A5FA] border border-[#2563EB]/20">
                {rolLabel[usuario?.rol ?? ''] ?? usuario?.rol}
              </span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06]">
            <div className="text-center">
              <div className="text-xl font-extrabold text-[#F5820A]">{stats.obrasAsignadas}</div>
              <div className="text-[10px] text-white/40 font-medium mt-0.5">Obras</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-[#16A34A]">{stats.checkinsHoy}</div>
              <div className="text-[10px] text-white/40 font-medium mt-0.5">Check-ins hoy</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-[#D97706]">{stats.incidenciasAbiertas}</div>
              <div className="text-[10px] text-white/40 font-medium mt-0.5">Incidencias</div>
            </div>
          </div>
        )}
      </div>

      {/* Info del sistema */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-lg">ℹ️</div>
          <div className="text-sm font-bold">Información del sistema</div>
        </div>
        <div className="space-y-2 text-sm text-white/50">
          <div className="flex justify-between">
            <span>Versión</span>
            <span className="text-white/70 font-medium">v0.2.0</span>
          </div>
          <div className="flex justify-between">
            <span>Modo</span>
            <span className="text-white/70 font-medium">Campo (instalador)</span>
          </div>
          <div className="flex justify-between">
            <span>Conectividad</span>
            <span className="text-[#16A34A] font-medium">● Online</span>
          </div>
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        disabled={cerrando}
        className="w-full h-12 bg-[#DC2626]/15 border border-[#DC2626]/20 text-[#F87171] font-bold rounded-[14px] text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {cerrando ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
