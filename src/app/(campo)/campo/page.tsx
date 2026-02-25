// src/app/(campo)/campo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ObraCampo {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  localidad: string | null;
  direccionInstalacion: string | null;
  potenciaKwp: number | null;
  cliente: { nombre: string; apellidos: string; telefono: string | null };
  checkinActivo: { id: string; horaEntrada: string } | null;
  _count: { incidencias: number };
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

const ESTADO_CFG: Record<string, { label: string; color: string }> = {
  PROGRAMADA: { label: 'Pendiente', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
  INSTALANDO: { label: 'En curso', color: 'bg-[#F5820A]/15 text-[#F5820A]' },
  VALIDACION_OPERATIVA: { label: 'Validación', color: 'bg-[#7C3AED]/15 text-[#A78BFA]' },
  REVISION_COORDINADOR: { label: 'Revisión', color: 'bg-[#D97706]/15 text-[#FBBF24]' },
};

export default function CampoHomePage() {
  const [obras, setObras] = useState<ObraCampo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObras();
  }, []);

  async function fetchObras() {
    try {
      const res = await fetch('/api/campo/obras');
      const data = await res.json();
      if (data.ok) {
        setObras(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Obra con checkin activo primero
  const obraActiva = obras.find((o) => o.checkinActivo);
  const obrasResto = obras.filter((o) => o !== obraActiva);
  const obrasOrdenadas = obraActiva ? [obraActiva, ...obrasResto] : obras;

  return (
    <div>
      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: '📍', label: 'Check-in', sub: 'Llegar a obra', color: 'bg-[#F5820A]/10 border-[#F5820A]/20', href: '/campo/checkin' },
          { icon: '✅', label: 'Validar', sub: 'Cerrar obra', color: 'bg-[#16A34A]/10 border-[#16A34A]/20', href: '/campo/validar' },
          { icon: '⚠️', label: 'Incidencia', sub: 'Reportar', color: 'bg-[#DC2626]/10 border-[#DC2626]/20', href: '/campo/incidencia' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} border rounded-[14px] p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-bold">{action.label}</span>
            <span className="text-[10px] text-white/40">{action.sub}</span>
          </Link>
        ))}
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: '📸', label: 'Fotos', sub: 'Subir fotos', color: 'bg-[#2563EB]/10 border-[#2563EB]/20', href: '/campo/fotos' },
          { icon: '🧾', label: 'Gasto', sub: 'Ticket', color: 'bg-[#D97706]/10 border-[#D97706]/20', href: '/campo/gastos' },
          { icon: '📋', label: 'Historial', sub: 'Jornadas', color: 'bg-[#7C3AED]/10 border-[#7C3AED]/20', href: '/campo/historial' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} border rounded-[14px] p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-bold">{action.label}</span>
            <span className="text-[10px] text-white/40">{action.sub}</span>
          </Link>
        ))}
      </div>

      {/* Mis obras */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Mis obras</h2>
        <span className="text-xs text-white/30 font-medium">
          {obras.length} obra{obras.length !== 1 ? 's' : ''} asignada{obras.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-[#F5820A]/20 border-t-[#F5820A] rounded-full animate-spin mx-auto" />
        </div>
      ) : obrasOrdenadas.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-8 text-center">
          <div className="text-3xl mb-2">☀️</div>
          <p className="text-sm text-white/40">No tienes obras asignadas activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obrasOrdenadas.map((obra) => {
            const cfg = ESTADO_CFG[obra.estado] || ESTADO_CFG.PROGRAMADA;
            const tieneCheckin = !!obra.checkinActivo;
            return (
              <div
                key={obra.id}
                className={`block bg-white/[0.04] border rounded-[14px] p-4 transition-colors ${
                  tieneCheckin
                    ? 'border-[#F5820A]/30 bg-[#F5820A]/[0.04]'
                    : 'border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{TIPO_ICONS[obra.tipo] || '⚡'}</span>
                    <div>
                      <div className="text-[11px] font-bold text-[#F5820A]">
                        {obra.codigo}
                        {tieneCheckin && (
                          <span className="ml-2 text-[9px] bg-[#16A34A] text-white px-1.5 py-0.5 rounded-full font-bold">
                            EN OBRA
                          </span>
                        )}
                      </div>
                      <div className="text-[15px] font-bold">
                        {obra.cliente.nombre} {obra.cliente.apellidos}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/35 mb-3">
                  {obra.direccionInstalacion && (
                    <span className="truncate">📍 {obra.localidad || obra.direccionInstalacion}</span>
                  )}
                  {obra.potenciaKwp && <span className="shrink-0">⚡ {obra.potenciaKwp} kWp</span>}
                  {obra._count.incidencias > 0 && (
                    <span className="shrink-0 text-[#DC2626]">⚠️ {obra._count.incidencias}</span>
                  )}
                </div>

                {/* Acciones rápidas por obra */}
                <div className="flex gap-2">
                  {!tieneCheckin && obra.estado === 'PROGRAMADA' && (
                    <Link
                      href={`/campo/checkin?obraId=${obra.id}`}
                      className="flex-1 h-10 bg-[#F5820A] text-white font-bold rounded-[10px] text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      📍 Check-in
                    </Link>
                  )}
                  {(tieneCheckin || obra.estado === 'INSTALANDO') && (
                    <>
                      <Link
                        href={`/campo/fotos?obraId=${obra.id}`}
                        className="flex-1 h-10 bg-[#2563EB]/15 text-[#60A5FA] font-bold rounded-[10px] text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                      >
                        📸 Fotos
                      </Link>
                      <Link
                        href={`/campo/validar?obraId=${obra.id}`}
                        className="flex-1 h-10 bg-[#16A34A]/15 text-[#4ADE80] font-bold rounded-[10px] text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                      >
                        ✅ Validar
                      </Link>
                      <Link
                        href={`/campo/incidencia?obraId=${obra.id}`}
                        className="h-10 w-10 bg-[#DC2626]/15 text-[#F87171] font-bold rounded-[10px] text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        ⚠️
                      </Link>
                    </>
                  )}
                  {obra.estado === 'VALIDACION_OPERATIVA' && (
                    <div className="flex-1 h-10 bg-[#7C3AED]/10 text-[#A78BFA] font-bold rounded-[10px] text-xs flex items-center justify-center">
                      ⏳ Pendiente revisión coordinador
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
