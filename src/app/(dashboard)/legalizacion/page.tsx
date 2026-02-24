// src/app/(dashboard)/legalizacion/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface LegItem {
  id: string; codigo: string; cliente: string; tipo: string;
  estadoLegal: string; expediente: string | null; localidad: string | null;
  potencia: number | null; diasEnEstado: number; alerta: boolean; updatedAt: string;
}

const ESTADOS_LEGAL: Record<string, { label: string; color: string; icon: string; step: number }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-auro-navy/10 text-auro-navy/60', icon: '⏳', step: 0 },
  SOLICITADA: { label: 'Solicitada', color: 'bg-estado-blue/10 text-estado-blue', icon: '📤', step: 1 },
  EN_TRAMITE: { label: 'En trámite', color: 'bg-auro-orange/10 text-auro-orange', icon: '⚙️', step: 2 },
  APROBADA: { label: 'Aprobada', color: 'bg-estado-green/10 text-estado-green', icon: '✅', step: 3 },
  INSCRITA: { label: 'Inscrita', color: 'bg-estado-green/10 text-estado-green', icon: '🏛️', step: 4 },
};

const SIGUIENTE: Record<string, { estado: string; label: string }> = {
  PENDIENTE: { estado: 'SOLICITADA', label: '📤 Solicitar' },
  SOLICITADA: { estado: 'EN_TRAMITE', label: '⚙️ Marcar en trámite' },
  EN_TRAMITE: { estado: 'APROBADA', label: '✅ Aprobar' },
  APROBADA: { estado: 'INSCRITA', label: '🏛️ Inscribir' },
};

export default function LegalizacionPage() {
  const [items, setItems] = useState<LegItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [detalle, setDetalle] = useState<LegItem | null>(null);
  const [expediente, setExpediente] = useState('');
  const [notas, setNotas] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtro ? `?estado=${filtro}` : '';
    const res = await fetch(`/api/legalizacion${params}`);
    const data = await res.json();
    if (data.ok) setItems(data.data);
    setLoading(false);
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function avanzar(item: LegItem) {
    const sig = SIGUIENTE[item.estadoLegal];
    if (!sig) return;
    await fetch('/api/legalizacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId: item.id, estado: sig.estado,
        expediente: expediente || undefined,
        notas: notas || undefined,
      }),
    });
    setDetalle(null); setExpediente(''); setNotas('');
    cargar();
  }

  const alertas = items.filter(i => i.alerta).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Legalización</h2>
        {alertas > 0 && (
          <span className="px-3 py-1 bg-estado-red/10 text-estado-red text-xs font-bold rounded-full animate-pulse">
            🚨 {alertas} estancada{alertas > 1 ? 's' : ''} (&gt;30d)
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pendientes', val: items.filter(i => i.estadoLegal === 'PENDIENTE').length, icon: '⏳', color: 'text-auro-navy/60' },
          { label: 'Solicitadas', val: items.filter(i => i.estadoLegal === 'SOLICITADA').length, icon: '📤', color: 'text-estado-blue' },
          { label: 'En trámite', val: items.filter(i => i.estadoLegal === 'EN_TRAMITE').length, icon: '⚙️', color: 'text-auro-orange' },
          { label: 'Inscritas', val: items.filter(i => i.estadoLegal === 'INSCRITA').length, icon: '🏛️', color: 'text-estado-green' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-card border border-auro-border p-3 text-center">
            <div className="text-lg">{k.icon}</div>
            <div className={`text-xl font-extrabold ${k.color}`}>{k.val}</div>
            <div className="text-[9px] text-auro-navy/30 font-semibold uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[{ key: '', label: 'Todas' }, ...Object.entries(ESTADOS_LEGAL).map(([key, cfg]) => ({ key, label: cfg.label }))].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtro === f.key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">No hay obras en legalización</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const est = ESTADOS_LEGAL[item.estadoLegal] || ESTADOS_LEGAL.PENDIENTE;
            return (
              <div key={item.id} onClick={() => { setDetalle(item); setExpediente(item.expediente || ''); }}
                className={`bg-white rounded-card border p-4 cursor-pointer transition-colors hover:border-auro-orange/30 ${item.alerta ? 'border-estado-red/40 bg-estado-red/[0.02]' : 'border-auro-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-auro-navy">{item.codigo}</span>
                    <span className="text-xs text-auro-navy/40">· {item.cliente}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${est.color}`}>
                    {est.icon} {est.label}
                  </span>
                </div>
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2, 3, 4].map(step => (
                    <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= est.step ? 'bg-estado-green' : 'bg-auro-surface-2'}`} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-auro-navy/40">
                  <div className="flex gap-3">
                    {item.localidad && <span>📍 {item.localidad}</span>}
                    {item.expediente && <span>📋 {item.expediente}</span>}
                  </div>
                  <span className={`font-semibold ${item.alerta ? 'text-estado-red' : ''}`}>
                    {item.diasEnEstado}d en estado {item.alerta && '🚨'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <h3 className="text-base font-bold mb-1">{detalle.codigo}</h3>
              <p className="text-xs text-auro-navy/40 mb-4">{detalle.cliente} · {detalle.localidad}</p>

              {/* Timeline */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">Progreso</div>
                <div className="space-y-2">
                  {Object.entries(ESTADOS_LEGAL).map(([key, cfg]) => {
                    const currentStep = ESTADOS_LEGAL[detalle.estadoLegal]?.step || 0;
                    const done = cfg.step <= currentStep;
                    const active = cfg.step === currentStep;
                    return (
                      <div key={key} className={`flex items-center gap-3 p-2 rounded-xl ${active ? 'bg-auro-orange/5 border border-auro-orange/20' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          done ? 'bg-estado-green text-white' : 'bg-auro-surface-2 text-auro-navy/25'
                        }`}>{done ? '✓' : cfg.step + 1}</div>
                        <span className={`text-xs font-semibold ${active ? 'text-auro-navy' : done ? 'text-estado-green' : 'text-auro-navy/25'}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nº Expediente</label>
                <input value={expediente} onChange={e => setExpediente(e.target.value)} placeholder="Ej: EX-2026/1234"
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas del cambio..."
                  className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40" />
              </div>

              {SIGUIENTE[detalle.estadoLegal] ? (
                <button onClick={() => avanzar(detalle)}
                  className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm transition-colors">
                  {SIGUIENTE[detalle.estadoLegal].label}
                </button>
              ) : (
                <div className="text-center py-3 text-estado-green text-sm font-bold">🏛️ Legalización completada</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
