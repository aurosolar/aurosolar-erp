// src/app/(portal)/portal/obras/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ObraDetalle {
  id: string; codigo: string; tipo: string; estado: string; estadoLegalizacion: string;
  direccionInstalacion: string; potenciaKwp: number | null; presupuestoTotal: number;
  cobrado: number; pendiente: number; porcentajeCobro: number;
  pagos: Array<{ id: string; importe: number; metodo: string; fechaCobro: string; concepto: string }>;
  incidencias: Array<{ id: string; gravedad: string; estado: string; descripcion: string; createdAt: string; fechaResolucion: string | null }>;
  documentos: Array<{ id: string; tipo: string; nombre: string; url: string; createdAt: string }>;
}

const ESTADO_STEPS = [
  { key: 'REVISION_TECNICA', label: 'Revisión', icon: '🔍' },
  { key: 'PREPARANDO', label: 'Preparando', icon: '📋' },
  { key: 'PROGRAMADA', label: 'Programada', icon: '📅' },
  { key: 'INSTALANDO', label: 'Instalando', icon: '⚡' },
  { key: 'LEGALIZACION', label: 'Legalizando', icon: '📋' },
  { key: 'COMPLETADA', label: 'Completada', icon: '🎉' },
];

export default function PortalObraDetalle() {
  const params = useParams();
  const [obra, setObra] = useState<ObraDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'estado' | 'pagos' | 'docs' | 'incidencias'>('estado');

  useEffect(() => {
    fetch(`/api/portal/obras/${params.id}`).then(r => r.json()).then(d => {
      if (d.ok) setObra(d.data);
      setLoading(false);
    });
  }, [params.id]);

  const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;
  if (!obra) return <div className="text-center py-12 text-auro-navy/40">Obra no encontrada</div>;

  const estadoIdx = ESTADO_STEPS.findIndex(s => s.key === obra.estado);

  return (
    <div>
      <Link href="/portal/obras" className="text-xs font-semibold text-auro-orange mb-3 inline-block">← Volver</Link>

      {/* Header obra */}
      <div className="bg-white rounded-xl border border-auro-border p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-auro-orange">{obra.codigo}</div>
            <div className="text-base font-bold text-auro-navy mt-0.5">{obra.tipo}</div>
          </div>
          {obra.potenciaKwp && <span className="text-xs bg-auro-surface-2 px-2 py-1 rounded-lg font-bold">⚡ {obra.potenciaKwp} kWp</span>}
        </div>
        {obra.direccionInstalacion && <div className="text-xs text-auro-navy/40 mb-3">📍 {obra.direccionInstalacion}</div>}

        {/* Progress bar cobro */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2.5 bg-auro-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-estado-green rounded-full transition-all" style={{ width: `${obra.porcentajeCobro}%` }} />
          </div>
          <span className="text-xs font-extrabold text-estado-green">{obra.porcentajeCobro}%</span>
        </div>
        <div className="flex justify-between text-[10px] text-auro-navy/30">
          <span>Pagado: {fmt(obra.cobrado)}</span>
          <span>Total: {fmt(obra.presupuestoTotal)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-auro-surface-2 rounded-xl p-1">
        {[
          { key: 'estado', label: 'Estado' },
          { key: 'pagos', label: `Pagos (${obra.pagos.length})` },
          { key: 'docs', label: `Docs (${obra.documentos.length})` },
          { key: 'incidencias', label: `Tickets (${obra.incidencias.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === t.key ? 'bg-white text-auro-navy shadow-sm' : 'text-auro-navy/30'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Estado (timeline) */}
      {tab === 'estado' && (
        <div className="bg-white rounded-xl border border-auro-border p-4">
          <h3 className="text-sm font-bold text-auro-navy mb-4">Progreso de tu instalación</h3>
          <div className="space-y-0">
            {ESTADO_STEPS.map((step, i) => {
              const done = i <= estadoIdx;
              const current = i === estadoIdx;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      current ? 'bg-auro-orange text-white shadow-md shadow-auro-orange/30' : done ? 'bg-estado-green/20 text-estado-green' : 'bg-auro-surface-2 text-auro-navy/20'
                    }`}>
                      {done && !current ? '✓' : step.icon}
                    </div>
                    {i < ESTADO_STEPS.length - 1 && <div className={`w-0.5 h-6 ${done ? 'bg-estado-green/30' : 'bg-auro-surface-2'}`} />}
                  </div>
                  <div className="pb-4">
                    <div className={`text-sm font-bold ${current ? 'text-auro-orange' : done ? 'text-auro-navy' : 'text-auro-navy/25'}`}>
                      {step.label}
                    </div>
                    {current && <div className="text-[10px] text-auro-orange/60 mt-0.5">Estado actual</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <div className="bg-white rounded-xl border border-auro-border overflow-hidden">
          {obra.pagos.length === 0 ? (
            <div className="p-8 text-center text-sm text-auro-navy/30">Sin pagos registrados</div>
          ) : (
            <div className="divide-y divide-auro-border">
              {obra.pagos.map((pago) => (
                <div key={pago.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-auro-navy">{fmt(pago.importe)}</div>
                    <div className="text-[10px] text-auro-navy/30">{pago.metodo} · {pago.concepto || 'Pago'}</div>
                  </div>
                  <span className="text-xs text-auro-navy/30">{new Date(pago.fechaCobro).toLocaleDateString('es-ES')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documentos */}
      {tab === 'docs' && (
        <div className="bg-white rounded-xl border border-auro-border overflow-hidden">
          {obra.documentos.length === 0 ? (
            <div className="p-8 text-center text-sm text-auro-navy/30">Sin documentos disponibles</div>
          ) : (
            <div className="divide-y divide-auro-border">
              {obra.documentos.map((doc) => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-3 flex items-center gap-3 hover:bg-auro-surface-2/50">
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-auro-navy truncate">{doc.nombre}</div>
                    <div className="text-[10px] text-auro-navy/30">{doc.tipo} · {new Date(doc.createdAt).toLocaleDateString('es-ES')}</div>
                  </div>
                  <span className="text-xs text-auro-orange font-semibold shrink-0">Descargar</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Incidencias */}
      {tab === 'incidencias' && (
        <div className="bg-white rounded-xl border border-auro-border overflow-hidden">
          {obra.incidencias.length === 0 ? (
            <div className="p-8 text-center text-sm text-auro-navy/30">Sin tickets de soporte</div>
          ) : (
            <div className="divide-y divide-auro-border">
              {obra.incidencias.map((inc) => (
                <div key={inc.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      inc.estado === 'RESUELTA' ? 'bg-estado-green/10 text-estado-green' : 'bg-estado-amber/10 text-estado-amber'
                    }`}>
                      {inc.estado === 'RESUELTA' ? '✅ Resuelta' : '🔄 En proceso'}
                    </span>
                    <span className="text-[10px] text-auro-navy/30">{new Date(inc.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                  <p className="text-sm text-auro-navy/70">{inc.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
