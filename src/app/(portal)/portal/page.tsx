// src/app/(portal)/portal/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Resumen {
  totalObras: number;
  obrasActivas: number;
  incidenciasAbiertas: number;
  totalPresupuestado: number;
  totalCobrado: number;
  pendiente: number;
}

interface ObraResumen {
  id: string; codigo: string; tipo: string; estado: string;
  presupuestoTotal: number; pagos: Array<{ importe: number }>;
}

export default function PortalHome() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [obras, setObras] = useState<ObraResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/resumen').then(r => r.json()),
      fetch('/api/portal/obras').then(r => r.json()),
    ]).then(([rRes, rObras]) => {
      if (rRes.ok) setResumen(rRes.data);
      if (rObras.ok) setObras(rObras.data);
      setLoading(false);
    });
  }, []);

  const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;

  const ESTADO_LABELS: Record<string, { label: string; icon: string }> = {
    REVISION_TECNICA: { label: 'En revisión', icon: '🔍' },
    PREPARANDO: { label: 'Preparando', icon: '📋' },
    PROGRAMADA: { label: 'Programada', icon: '📅' },
    INSTALANDO: { label: 'En instalación', icon: '⚡' },
    TERMINADA: { label: 'Instalación completada', icon: '✅' },
    LEGALIZACION: { label: 'En legalización', icon: '📋' },
    LEGALIZADA: { label: 'Legalizada', icon: '🏆' },
    COMPLETADA: { label: 'Completada', icon: '🎉' },
    INCIDENCIA: { label: 'Con incidencia', icon: '⚠️' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Bienvenida */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-auro-navy">Bienvenido a tu portal</h1>
        <p className="text-sm text-auro-navy/40 mt-1">Consulta el estado de tus instalaciones</p>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-auro-border p-3 text-center">
            <div className="text-2xl font-extrabold text-auro-orange">{resumen.obrasActivas}</div>
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase">Obras activas</div>
          </div>
          <div className="bg-white rounded-xl border border-auro-border p-3 text-center">
            <div className="text-2xl font-extrabold text-estado-green">{resumen.pendiente > 0 ? fmt(resumen.totalCobrado) : '✅'}</div>
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase">{resumen.pendiente > 0 ? 'Pagado' : 'Al día'}</div>
          </div>
          <div className="bg-white rounded-xl border border-auro-border p-3 text-center">
            <div className="text-2xl font-extrabold text-estado-blue">{resumen.incidenciasAbiertas}</div>
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase">Tickets</div>
          </div>
        </div>
      )}

      {/* Mis obras */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-auro-navy">Mis instalaciones</h2>
          <Link href="/portal/obras" className="text-xs font-semibold text-auro-orange">Ver todas →</Link>
        </div>

        {obras.length === 0 ? (
          <div className="bg-white rounded-xl border border-auro-border p-8 text-center">
            <div className="text-3xl mb-2">☀️</div>
            <p className="text-sm text-auro-navy/40">Aún no tienes instalaciones registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {obras.slice(0, 3).map((obra) => {
              const cobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
              const pct = obra.presupuestoTotal > 0 ? Math.round((cobrado / obra.presupuestoTotal) * 100) : 0;
              const est = ESTADO_LABELS[obra.estado] || { label: obra.estado, icon: '📌' };

              return (
                <Link key={obra.id} href={`/portal/obras/${obra.id}`}
                  className="block bg-white rounded-xl border border-auro-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs font-bold text-auro-orange">{obra.codigo}</div>
                      <div className="text-sm font-semibold text-auro-navy mt-0.5">{est.icon} {est.label}</div>
                    </div>
                    <span className="text-xs font-bold text-auro-navy/20">{obra.tipo}</span>
                  </div>
                  {/* Barra de cobro */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-auro-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-estado-green rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-auro-navy/30">{pct}% pagado</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Acceso rápido soporte */}
      <Link href="/portal/soporte"
        className="block bg-auro-orange/5 border border-auro-orange/20 rounded-xl p-4 text-center hover:bg-auro-orange/10 transition-colors">
        <span className="text-2xl block mb-1">💬</span>
        <span className="text-sm font-bold text-auro-orange">¿Necesitas ayuda? Abre un ticket</span>
      </Link>
    </div>
  );
}
