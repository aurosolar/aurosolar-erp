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
  cliente: { nombre: string; apellidos: string };
  instaladores: Array<{ instalador: { nombre: string } }>;
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  PROGRAMADA: { label: 'Pendiente', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
  INSTALANDO: { label: 'En curso', color: 'bg-[#F5820A]/15 text-[#F5820A]' },
  TERMINADA: { label: 'Lista', color: 'bg-[#16A34A]/15 text-[#4ADE80]' },
  INCIDENCIA: { label: 'Incidencia', color: 'bg-[#DC2626]/15 text-[#F87171]' },
};

export default function CampoHomePage() {
  const [obras, setObras] = useState<ObraCampo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObras();
  }, []);

  async function fetchObras() {
    try {
      const res = await fetch('/api/obras?limit=20');
      const data = await res.json();
      if (data.ok) {
        // Filtrar solo obras activas del instalador
        setObras(data.data.obras.filter((o: ObraCampo) =>
          ['PROGRAMADA', 'INSTALANDO', 'INCIDENCIA', 'TERMINADA'].includes(o.estado)
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: '📍', label: 'Check-in', sub: 'Llegar a obra', color: 'bg-[#F5820A]/10', href: '/campo/checkin' },
          { icon: '✅', label: 'Validar', sub: 'Cerrar obra', color: 'bg-[#16A34A]/10', href: '/campo/validar' },
          { icon: '⚠️', label: 'Incidencia', sub: 'Reportar', color: 'bg-[#DC2626]/10', href: '/campo/incidencia' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} border border-white/[0.06] rounded-[14px] p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-bold">{action.label}</span>
            <span className="text-[10px] text-white/40">{action.sub}</span>
          </Link>
        ))}
      </div>

      {/* Segunda fila de acciones */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: '📸', label: 'Fotos', sub: 'Subir fotos', color: 'bg-[#2563EB]/10', href: '/campo/fotos' },
          { icon: '🧾', label: 'Gasto', sub: 'Ticket', color: 'bg-[#D97706]/10', href: '/campo/gastos' },
          { icon: '📡', label: 'Offline', sub: '0 en cola', color: 'bg-[#7C3AED]/10', href: '#' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} border border-white/[0.06] rounded-[14px] p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-bold">{action.label}</span>
            <span className="text-[10px] text-white/40">{action.sub}</span>
          </Link>
        ))}
      </div>

      {/* Obras del día */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Obras del día</h2>
        <span className="text-xs text-white/30 font-medium">{obras.length} obra{obras.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-[#F5820A]/20 border-t-[#F5820A] rounded-full animate-spin mx-auto" />
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-8 text-center">
          <div className="text-3xl mb-2">☀️</div>
          <p className="text-sm text-white/40">No hay obras asignadas para hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra) => {
            const estadoCfg = ESTADO_LABELS[obra.estado] || ESTADO_LABELS.PROGRAMADA;
            return (
              <Link
                key={obra.id}
                href={`/campo/obra/${obra.id}`}
                className="block bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-4 active:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{TIPO_ICONS[obra.tipo] || '⚡'}</span>
                    <div>
                      <div className="text-[11px] font-bold text-[#F5820A]">{obra.codigo}</div>
                      <div className="text-[15px] font-bold">{obra.cliente.nombre} {obra.cliente.apellidos}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${estadoCfg.color}`}>
                    {estadoCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/35">
                  {obra.direccionInstalacion && (
                    <span className="truncate">📍 {obra.direccionInstalacion}</span>
                  )}
                  {obra.potenciaKwp && <span className="shrink-0">⚡ {obra.potenciaKwp} kWp</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
