// src/app/(dashboard)/activos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Mantenimiento {
  id: string; tipo: string; estado: string;
  fechaProgramada: string | null; fechaRealizada: string | null;
  descripcion: string | null; resultado: string | null;
}

interface Activo {
  id: string; tipo: string; marca: string | null; modelo: string | null;
  numeroSerie: string | null; potencia: number | null;
  fechaInstalacion: string | null; garantiaHasta: string | null;
  obra: {
    codigo: string;
    cliente: { id: string; nombre: string; apellidos: string };
  };
  mantenimientos: Mantenimiento[];
}

interface Resumen {
  total: number; garantiaVencida: number;
  garantiaProxima: number; mantenimientosPendientes: number;
}

const TIPOS_ACTIVO: Record<string, { icon: string; color: string }> = {
  'Panel': { icon: '☀️', color: 'bg-auro-orange/10 text-auro-orange' },
  'Inversor': { icon: '⚡', color: 'bg-estado-blue/10 text-estado-blue' },
  'Batería': { icon: '🔋', color: 'bg-estado-green/10 text-estado-green' },
  'Estructura': { icon: '🏗️', color: 'bg-auro-navy/10 text-auro-navy' },
  'Aerotermia': { icon: '🌡️', color: 'bg-estado-purple/10 text-estado-purple' },
  'Optimizador': { icon: '🔌', color: 'bg-estado-blue/10 text-estado-blue' },
  'Monitorización': { icon: '📡', color: 'bg-auro-navy/10 text-auro-navy' },
};

const garantiaStatus = (hasta: string | null) => {
  if (!hasta) return { label: 'Sin datos', color: 'text-auro-navy/30', icon: '—' };
  const diff = (new Date(hasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: 'Vencida', color: 'text-estado-red', icon: '🔴' };
  if (diff < 90) return { label: `${Math.ceil(diff)}d`, color: 'text-auro-orange', icon: '🟡' };
  const anios = Math.floor(diff / 365);
  const meses = Math.floor((diff % 365) / 30);
  return { label: anios > 0 ? `${anios}a ${meses}m` : `${meses}m`, color: 'text-estado-green', icon: '🟢' };
};

export default function ActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Activo | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showMant, setShowMant] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtroTipo ? `?tipo=${filtroTipo}` : '';
    const [resAct, resKpi] = await Promise.all([
      fetch(`/api/activos${params}`).then(r => r.json()),
      fetch('/api/activos/resumen').then(r => r.json()),
    ]);
    if (resAct.ok) setActivos(resAct.data);
    if (resKpi.ok) setResumen(resKpi.data);
    setLoading(false);
  }, [filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = activos.filter(a => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      a.marca?.toLowerCase().includes(q) ||
      a.modelo?.toLowerCase().includes(q) ||
      a.numeroSerie?.toLowerCase().includes(q) ||
      a.obra.codigo.toLowerCase().includes(q) ||
      a.obra.cliente.nombre.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Activos instalados</h2>
        <button onClick={() => setShowCrear(true)} className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Registrar activo
        </button>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total activos', val: resumen.total, icon: '📦', color: 'text-auro-navy' },
            { label: 'Garantía vencida', val: resumen.garantiaVencida, icon: '🔴', color: 'text-estado-red' },
            { label: 'Vence <90 días', val: resumen.garantiaProxima, icon: '🟡', color: 'text-auro-orange' },
            { label: 'Mant. pendiente', val: resumen.mantenimientosPendientes, icon: '🔧', color: 'text-estado-blue' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-card border border-auro-border p-3.5">
              <div className="text-lg mb-1">{k.icon}</div>
              <div className={`text-2xl font-extrabold ${k.color}`}>{k.val}</div>
              <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar marca, modelo, nº serie, obra..."
          className="flex-1 min-w-[200px] h-9 px-3 bg-white border border-auro-border rounded-input text-xs focus:outline-none focus:border-auro-orange/40" />
        <div className="flex gap-1 overflow-x-auto">
          {[{ key: '', label: 'Todos' }, ...Object.entries(TIPOS_ACTIVO).map(([key, cfg]) => ({ key, label: `${cfg.icon} ${key}` }))].map(f => (
            <button key={f.key} onClick={() => setFiltroTipo(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroTipo === f.key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">No hay activos registrados</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(a => {
            const tipoCfg = TIPOS_ACTIVO[a.tipo] || { icon: '📦', color: 'bg-auro-surface-2 text-auro-navy/50' };
            const gar = garantiaStatus(a.garantiaHasta);
            return (
              <div key={a.id} onClick={() => setDetalle(a)}
                className="bg-white rounded-card border border-auro-border p-4 hover:border-auro-orange/30 cursor-pointer transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${tipoCfg.color}`}>
                    {tipoCfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold">{a.marca || 'Sin marca'} {a.modelo || ''}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tipoCfg.color}`}>{a.tipo}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-auro-navy/40">
                      <span>🏗️ {a.obra.codigo}</span>
                      <span>👤 {a.obra.cliente.nombre} {a.obra.cliente.apellidos}</span>
                      {a.numeroSerie && <span className="font-mono text-[10px]">S/N: {a.numeroSerie}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold ${gar.color}`}>{gar.icon} {gar.label}</div>
                    {a.potencia && <div className="text-[10px] text-auro-navy/30">{a.potencia} kWp</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <DetalleModal activo={detalle} onClose={() => setDetalle(null)}
          onMant={(id) => { setDetalle(null); setShowMant(id); }}
          onRefresh={cargar} />
      )}

      {showCrear && <CrearActivoModal onClose={() => setShowCrear(false)} onCreado={() => { cargar(); setShowCrear(false); }} />}

      {showMant && <MantModal activoId={showMant} onClose={() => setShowMant(null)} onCreado={() => { cargar(); setShowMant(null); }} />}
    </div>
  );
}

// ── Modal Detalle ──
function DetalleModal({ activo, onClose, onMant, onRefresh }: {
  activo: Activo; onClose: () => void; onMant: (id: string) => void; onRefresh: () => void;
}) {
  const tipoCfg = TIPOS_ACTIVO[activo.tipo] || { icon: '📦', color: 'bg-auro-surface-2 text-auro-navy/50' };
  const gar = garantiaStatus(activo.garantiaHasta);

  async function completarMant(mantId: string) {
    const resultado = prompt('Resultado del mantenimiento:');
    if (!resultado) return;
    await fetch(`/api/mantenimientos/${mantId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado }),
    });
    onRefresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${tipoCfg.color}`}>{tipoCfg.icon}</div>
            <div className="flex-1">
              <h3 className="text-base font-bold">{activo.marca} {activo.modelo}</h3>
              <p className="text-xs text-auro-navy/40">{activo.tipo} · {activo.obra.codigo}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { label: 'Cliente', val: `${activo.obra.cliente.nombre} ${activo.obra.cliente.apellidos}` },
              { label: 'Nº Serie', val: activo.numeroSerie || '—' },
              { label: 'Potencia', val: activo.potencia ? `${activo.potencia} kWp` : '—' },
              { label: 'Instalado', val: activo.fechaInstalacion ? new Date(activo.fechaInstalacion).toLocaleDateString('es-ES') : '—' },
              { label: 'Garantía hasta', val: activo.garantiaHasta ? new Date(activo.garantiaHasta).toLocaleDateString('es-ES') : '—' },
              { label: 'Estado garantía', val: `${gar.icon} ${gar.label}` },
            ].map(i => (
              <div key={i.label} className="bg-auro-surface-2 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-auro-navy/30 uppercase">{i.label}</div>
                <div className="text-xs font-semibold mt-0.5">{i.val}</div>
              </div>
            ))}
          </div>

          {/* Mantenimientos */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-auro-navy/30 uppercase">Historial mantenimiento</span>
              <button onClick={() => onMant(activo.id)} className="text-[10px] font-bold text-auro-orange">+ Programar</button>
            </div>
            {activo.mantenimientos.length === 0 ? (
              <div className="text-xs text-auro-navy/20 bg-auro-surface-2 rounded-xl p-3 text-center">Sin mantenimientos</div>
            ) : (
              <div className="space-y-1.5">
                {activo.mantenimientos.map(m => {
                  const estColor = m.estado === 'COMPLETADO' ? 'bg-estado-green/10 text-estado-green' :
                    m.estado === 'EN_CURSO' ? 'bg-auro-orange/10 text-auro-orange' :
                    m.estado === 'CANCELADO' ? 'bg-estado-red/10 text-estado-red' :
                    'bg-estado-blue/10 text-estado-blue';
                  return (
                    <div key={m.id} className="bg-auro-surface-2 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold">🔧 {m.tipo}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${estColor}`}>{m.estado}</span>
                      </div>
                      <div className="text-[10px] text-auro-navy/40">
                        {m.fechaProgramada && <span>📅 {new Date(m.fechaProgramada).toLocaleDateString('es-ES')}</span>}
                        {m.descripcion && <span> · {m.descripcion}</span>}
                      </div>
                      {m.resultado && <div className="text-[10px] text-estado-green mt-0.5">✅ {m.resultado}</div>}
                      {m.estado === 'PROGRAMADO' && (
                        <button onClick={() => completarMant(m.id)} className="mt-1 text-[10px] font-bold text-auro-orange hover:underline">
                          Marcar completado
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Crear Activo ──
function CrearActivoModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [obras, setObras] = useState<Array<{ id: string; codigo: string }>>([]);
  const [form, setForm] = useState({
    obraId: '', tipo: 'Panel', marca: '', modelo: '',
    numeroSerie: '', potencia: '', garantiaAnios: '25',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.map((o: any) => ({ id: o.id, codigo: o.codigo })));
    });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.obraId || !form.tipo) { setError('Selecciona obra y tipo'); return; }
    setGuardando(true); setError('');
    const body: any = {
      obraId: form.obraId, tipo: form.tipo,
      marca: form.marca || undefined, modelo: form.modelo || undefined,
      numeroSerie: form.numeroSerie || undefined,
      potencia: form.potencia ? parseFloat(form.potencia) : undefined,
      garantiaAnios: form.garantiaAnios ? parseInt(form.garantiaAnios) : undefined,
    };
    const res = await fetch('/api/activos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) onCreado();
    else setError(data.error || 'Error');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">Registrar activo</h3>
          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Obra</label>
            <select value={form.obraId} onChange={e => set('obraId', e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
              <option value="">Selecciona obra...</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.codigo}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Tipo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(TIPOS_ACTIVO).map(([key, cfg]) => (
                <button key={key} onClick={() => set('tipo', key)}
                  className={`h-12 rounded-xl border-2 flex flex-col items-center justify-center text-[10px] font-semibold transition-all
                    ${form.tipo === key ? cfg.color + ' border-current' : 'border-auro-border text-auro-navy/30'}`}>
                  <span className="text-base">{cfg.icon}</span>
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Marca</label>
              <input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="ej: Huawei"
                className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Modelo</label>
              <input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="ej: SUN2000-6KTL"
                className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nº Serie</label>
              <input value={form.numeroSerie} onChange={e => set('numeroSerie', e.target.value)}
                className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Potencia (kWp)</label>
              <input type="number" value={form.potencia} onChange={e => set('potencia', e.target.value)} step="0.1"
                className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Garantía (años)</label>
              <input type="number" value={form.garantiaAnios} onChange={e => set('garantiaAnios', e.target.value)}
                className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Registrando...' : '📦 Registrar activo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Programar Mantenimiento ──
function MantModal({ activoId, onClose, onCreado }: { activoId: string; onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({
    tipo: 'Preventivo', fechaProgramada: '', descripcion: '', coste: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.fechaProgramada) { setError('Indica fecha'); return; }
    setGuardando(true); setError('');
    const body: any = {
      activoId, tipo: form.tipo, fechaProgramada: form.fechaProgramada,
      descripcion: form.descripcion || undefined,
      coste: form.coste ? Math.round(parseFloat(form.coste) * 100) : undefined,
    };
    const res = await fetch('/api/mantenimientos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) onCreado();
    else setError(data.error || 'Error');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">🔧 Programar mantenimiento</h3>
          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['Preventivo', 'Correctivo', 'Limpieza', 'Revisión'].map(t => (
                <button key={t} onClick={() => set('tipo', t)}
                  className={`h-9 rounded-lg text-xs font-semibold border-2 transition-all ${form.tipo === t ? 'border-auro-orange bg-auro-orange/10 text-auro-orange' : 'border-auro-border text-auro-navy/40'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Fecha</label>
            <input type="date" value={form.fechaProgramada} onChange={e => set('fechaProgramada', e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40" />
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Coste estimado (€)</label>
            <input type="number" value={form.coste} onChange={e => set('coste', e.target.value)} step="0.01"
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Programando...' : '🔧 Programar'}
          </button>
        </div>
      </div>
    </div>
  );
}
