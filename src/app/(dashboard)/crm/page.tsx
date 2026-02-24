// src/app/(dashboard)/crm/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string; nombre: string; apellidos: string; telefono: string; email: string;
  estado: string; origen: string; direccion: string | null; tipo: string; potenciaEstimada: number | null;
  importeEstimado: number | null; notas: string; createdAt: string;
  comercial: { id: string; nombre: string } | null;
  visitas: Array<{ fecha: string; resultado: string }>;
}

interface PipelineCol {
  estado: string; label: string; icon: string; color: string; conteo: number; valorEstimado: number;
}

const COLS: Omit<PipelineCol, 'conteo' | 'valorEstimado'>[] = [
  { estado: 'NUEVO', label: 'Nuevo', icon: '🆕', color: 'border-t-estado-blue' },
  { estado: 'CONTACTADO', label: 'Contactado', icon: '📞', color: 'border-t-estado-purple' },
  { estado: 'VISITA_PROGRAMADA', label: 'Visita prog.', icon: '📅', color: 'border-t-estado-amber' },
  { estado: 'PRESUPUESTO_ENVIADO', label: 'Presupuesto', icon: '📄', color: 'border-t-auro-orange' },
  { estado: 'ACEPTADO', label: 'Aceptado', icon: '✅', color: 'border-t-estado-green' },
];

const ORIGENES: Record<string, string> = {
  WEB: '🌐', RECOMENDACION: '👥', FERIA: '🎪', PUERTA_FRIA: '🚪', REPETIDOR: '🔁', TELEFONO: '📱', OTRO: '📌',
};

const TIPOS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾', BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [detalleLead, setDetalleLead] = useState<Lead | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [rLeads, rPipeline] = await Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/crm/pipeline').then(r => r.json()),
    ]);
    if (rLeads.ok) setLeads(rLeads.data);
    if (rPipeline.ok) setPipeline(COLS.map(c => ({
      ...c,
      conteo: rPipeline.data.find((p: any) => p.estado === c.estado)?.conteo || 0,
      valorEstimado: rPipeline.data.find((p: any) => p.estado === c.estado)?.valorEstimado || 0,
    })));
    setLoading(false);
  }

  async function avanzar(leadId: string, nuevoEstado: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    cargar();
    setDetalleLead(null);
  }

  async function convertir(leadId: string) {
    setConvirtiendo(true);
    const res = await fetch(`/api/leads/${leadId}/convertir`, { method: 'POST' });
    const data = await res.json();
    setConvirtiendo(false);
    if (data.ok) {
      setDetalleLead(null);
      cargar();
      alert(`✅ Obra ${data.data.obra.codigo} creada`);
    } else {
      alert(`Error: ${data.error}`);
    }
  }

  const fmt = (c: number) => c >= 100000 ? `${Math.round(c / 100000)}K€` : `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">CRM Comercial</h2>
        <button onClick={() => setShowCrear(true)} className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Nuevo lead
        </button>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
        {pipeline.map((col) => {
          const colLeads = leads.filter(l => l.estado === col.estado);
          return (
            <div key={col.estado} className="min-w-[260px] flex-1 flex flex-col">
              {/* Column header */}
              <div className={`bg-white rounded-t-card border border-auro-border border-t-[3px] ${col.color} px-3 py-2.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{col.icon} {col.label}</span>
                  <span className="text-[10px] font-extrabold text-auro-navy/30 bg-auro-surface-2 px-1.5 py-0.5 rounded-md">{col.conteo}</span>
                </div>
                {col.valorEstimado > 0 && (
                  <div className="text-[10px] font-semibold text-auro-navy/30 mt-0.5">{fmt(col.valorEstimado)}</div>
                )}
              </div>
              {/* Column body */}
              <div className="flex-1 bg-auro-surface-2/50 border-x border-b border-auro-border rounded-b-card p-2 space-y-2 min-h-[200px]">
                {colLeads.length === 0 ? (
                  <div className="text-center text-[10px] text-auro-navy/20 py-8">Sin leads</div>
                ) : colLeads.map((lead) => {
                  const dias = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
                  return (
                    <div key={lead.id} onClick={() => setDetalleLead(lead)}
                      className="bg-white rounded-xl border border-auro-border p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="text-sm font-bold text-auro-navy leading-tight">{lead.nombre} {lead.apellidos}</div>
                        <span className="text-[9px] text-auro-navy/25 shrink-0 ml-2">{dias}d</span>
                      </div>
                      {lead.telefono && (
                        <a href={`tel:${lead.telefono}`} onClick={e => e.stopPropagation()}
                          className="text-xs text-auro-orange font-semibold hover:underline block mb-1">
                          📱 {lead.telefono}
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-auro-navy/40">
                        <span title={lead.origen}>{ORIGENES[lead.origen] || '📌'}</span>
                        <span title={lead.tipo}>{TIPOS[lead.tipo] || '🏠'}</span>
                        {lead.potenciaEstimada && <span>{lead.potenciaEstimada}kWp</span>}
                        {lead.importeEstimado && <span className="font-bold ml-auto">{fmt(lead.importeEstimado)}</span>}
                      </div>
                      {lead.comercial && (
                        <div className="text-[9px] text-auro-navy/25 mt-1.5">{lead.comercial.nombre}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal detalle lead */}
      {detalleLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetalleLead(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{detalleLead.nombre} {detalleLead.apellidos}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-auro-orange/10 text-auro-orange">{detalleLead.estado.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-auro-navy/30">{ORIGENES[detalleLead.origen]} {detalleLead.origen}</span>
                  </div>
                </div>
                <button onClick={() => setDetalleLead(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-auro-surface-2 text-auro-navy/30">✕</button>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                {detalleLead.telefono && (
                  <a href={`tel:${detalleLead.telefono}`} className="flex items-center gap-2 text-sm text-auro-orange font-semibold">📱 {detalleLead.telefono}</a>
                )}
                {detalleLead.email && <div className="text-sm text-auro-navy/60">📧 {detalleLead.email}</div>}
                {detalleLead?.notas && <div className="text-sm text-auro-navy/60">📍 {detalleLead?.notas}</div>}
                <div className="flex gap-3">
                  {detalleLead.potenciaEstimada && <span className="text-xs bg-auro-surface-2 px-2 py-1 rounded-lg">⚡ {detalleLead.potenciaEstimada} kWp</span>}
                  {detalleLead.importeEstimado && <span className="text-xs bg-auro-surface-2 px-2 py-1 rounded-lg font-bold">💶 {fmt(detalleLead.importeEstimado)}</span>}
                  <span className="text-xs bg-auro-surface-2 px-2 py-1 rounded-lg">{TIPOS[detalleLead.tipo]} {detalleLead.tipo}</span>
                </div>
                {detalleLead.notas && <div className="text-xs text-auro-navy/40 bg-auro-surface-2 p-2.5 rounded-xl">{detalleLead.notas}</div>}
              </div>

              {/* Última visita */}
              {detalleLead.visitas?.length > 0 && (
                <div className="mb-4 p-2.5 bg-estado-blue/5 rounded-xl border border-estado-blue/10">
                  <div className="text-[10px] font-bold text-estado-blue/60 uppercase mb-1">Última visita</div>
                  <div className="text-xs text-auro-navy/60">
                    {new Date(detalleLead.visitas[0].fecha).toLocaleDateString('es-ES')} — {detalleLead.visitas[0].resultado}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="space-y-2">
                {detalleLead.estado === 'ACEPTADO' ? (
                  <button onClick={() => convertir(detalleLead.id)} disabled={convirtiendo}
                    className="w-full h-11 bg-estado-green text-white font-bold rounded-button text-sm disabled:opacity-50">
                    {convirtiendo ? 'Creando obra...' : '🏗️ Convertir a obra'}
                  </button>
                ) : (
                  <>
                    {detalleLead.estado === 'NUEVO' && (
                      <button onClick={() => avanzar(detalleLead.id, 'CONTACTADO')} className="w-full h-10 bg-estado-purple/10 text-estado-purple font-bold rounded-button text-sm">📞 Marcar como contactado</button>
                    )}
                    {detalleLead.estado === 'CONTACTADO' && (
                      <button onClick={() => avanzar(detalleLead.id, 'VISITA_PROGRAMADA')} className="w-full h-10 bg-estado-amber/10 text-estado-amber font-bold rounded-button text-sm">📅 Programar visita</button>
                    )}
                    {detalleLead.estado === 'VISITA_PROGRAMADA' && (
                      <button onClick={() => avanzar(detalleLead.id, 'PRESUPUESTO_ENVIADO')} className="w-full h-10 bg-auro-orange/10 text-auro-orange font-bold rounded-button text-sm">📄 Presupuesto enviado</button>
                    )}
                    {detalleLead.estado === 'PRESUPUESTO_ENVIADO' && (
                      <button onClick={() => avanzar(detalleLead.id, 'ACEPTADO')} className="w-full h-10 bg-estado-green/10 text-estado-green font-bold rounded-button text-sm">✅ Aceptado</button>
                    )}
                    {detalleLead.estado !== 'CONVERTIDO' && detalleLead.estado !== 'NO_INTERESADO' && (
                      <button onClick={() => avanzar(detalleLead.id, 'NO_INTERESADO')} className="w-full h-8 text-estado-red/50 text-[11px] font-semibold hover:text-estado-red">Marcar como no interesado</button>
                    )}
                    {detalleLead.estado === 'NO_INTERESADO' && (
                      <button onClick={() => avanzar(detalleLead.id, 'CONTACTADO')} className="w-full h-10 bg-estado-blue/10 text-estado-blue font-bold rounded-button text-sm">🔄 Re-contactar</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear lead */}
      {showCrear && <CrearLeadModal onClose={() => setShowCrear(false)} onCreado={cargar} />}
    </div>
  );
}

// ── Modal crear lead ──
function CrearLeadModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({
    nombre: '', apellidos: '', telefono: '', email: '', direccion: '', localidad: '', provincia: '',
    origen: 'TELEFONO', tipo: 'RESIDENCIAL', potenciaEstimada: '', importeEstimado: '', notas: '',
  });
  const [guardando, setGuardando] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    const body = {
      ...form,
      potenciaEstimada: form.potenciaEstimada ? parseFloat(form.potenciaEstimada) : undefined,
      importeEstimado: form.importeEstimado ? parseInt(form.importeEstimado) * 100 : undefined,
    };
    const res = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if ((await res.json()).ok) { onCreado(); onClose(); }
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">Nuevo lead</h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Apellidos</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} type="tel" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Dirección instalación</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Origen</label>
              <select value={form.origen} onChange={e => set('origen', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
                {Object.entries(ORIGENES).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Potencia (kWp)</label>
              <input value={form.potenciaEstimada} onChange={e => set('potenciaEstimada', e.target.value)} type="number" step="0.1" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Importe est. (€)</label>
              <input value={form.importeEstimado} onChange={e => set('importeEstimado', e.target.value)} type="number" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40" />
          </div>

          <button onClick={guardar} disabled={guardando || !form.nombre.trim()} className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : '+ Crear lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
