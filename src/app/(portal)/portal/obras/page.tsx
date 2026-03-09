// src/app/(portal)/portal/obras/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Obra {
  id: string; codigo: string; tipo: string; estado: string; estadoLegalizacion: string;
  direccionInstalacion: string; potenciaKwp: number | null; presupuestoTotal: number;
  createdAt: string; pagos: Array<{ importe: number }>;
}

const ESTADO_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  REVISION_TECNICA: { label: 'En revisión', icon: '🔍', color: 'bg-estado-purple/10 text-estado-purple' },
  PREPARANDO: { label: 'Preparando', icon: '📋', color: 'bg-estado-amber/10 text-estado-amber' },
  PROGRAMADA: { label: 'Programada', icon: '📅', color: 'bg-estado-blue/10 text-estado-blue' },
  INSTALANDO: { label: 'Instalando', icon: '⚡', color: 'bg-auro-orange/10 text-auro-orange' },
  LEGALIZACION: { label: 'Legalizando', icon: '📋', color: 'bg-estado-blue/10 text-estado-blue' },
  LEGALIZADA: { label: 'Legalizada', icon: '🏆', color: 'bg-estado-green/10 text-estado-green' },
  COMPLETADA: { label: 'Completada', icon: '🎉', color: 'bg-estado-green/10 text-estado-green' },
  INCIDENCIA: { label: 'Incidencia', icon: '⚠️', color: 'bg-estado-red/10 text-estado-red' },
};

export default function PortalObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/obras').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data);
      setLoading(false);
    });
  }, []);

  const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-auro-navy mb-5">Mis instalaciones</h1>

      {obras.length === 0 ? (
        <div className="bg-white rounded-xl border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">☀️</div>
          <p className="text-sm text-auro-navy/40">No tienes instalaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra) => {
            const cobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
            const pct = obra.presupuestoTotal > 0 ? Math.round((cobrado / obra.presupuestoTotal) * 100) : 0;
            const est = ESTADO_LABELS[obra.estado] || { label: obra.estado, icon: '📌', color: 'bg-auro-navy/10 text-auro-navy' };

            return (
              <Link key={obra.id} href={`/portal/obras/${obra.id}`}
                className="block bg-white rounded-xl border border-auro-border p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs font-bold text-auro-orange">{obra.codigo}</div>
                    {obra.direccionInstalacion && <div className="text-xs text-auro-navy/40 mt-0.5">📍 {obra.direccionInstalacion}</div>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${est.color}`}>
                    {est.icon} {est.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-auro-navy/40 mb-2">
                  {obra.potenciaKwp && <span>⚡ {obra.potenciaKwp} kWp</span>}
                  <span>{obra.tipo}</span>
                  <span>{new Date(obra.createdAt).toLocaleDateString('es-ES')}</span>
                </div>

                {/* Barra de cobro */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-auro-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-estado-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-auro-navy/30 shrink-0">{fmt(cobrado)} / {fmt(obra.presupuestoTotal)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
