// src/app/(dashboard)/materiales/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Linea {
  id: string; producto: string; cantidad: number;
  costeUnitario: number; recibido: number;
}

interface Solicitud {
  id: string; obraId: string; estado: string; proveedor: string | null;
  costeTotal: number; notas: string | null; fechaEntregaPrevista: string | null;
  createdAt: string;
  obra: { codigo: string; cliente: { nombre: string; apellidos: string } };
  lineas: Linea[];
}

const ESTADOS_MAT: Record<string, { label: string; color: string; icon: string }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-auro-navy/10 text-auro-navy/60', icon: '📝' },
  ENVIADA: { label: 'Enviada', color: 'bg-estado-blue/10 text-estado-blue', icon: '📤' },
  APROBADA: { label: 'Aprobada', color: 'bg-estado-green/10 text-estado-green', icon: '✅' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-estado-red/10 text-estado-red', icon: '❌' },
  PEDIDA: { label: 'Pedida', color: 'bg-auro-orange/10 text-auro-orange', icon: '🛒' },
  RECIBIDA_PARCIAL: { label: 'Parcial', color: 'bg-estado-purple/10 text-estado-purple', icon: '📦' },
  RECIBIDA: { label: 'Recibida', color: 'bg-estado-green/10 text-estado-green', icon: '✅' },
};

const ACCIONES: Record<string, Array<{ estado: string; label: string; color: string; permiso?: string }>> = {
  BORRADOR: [{ estado: 'ENVIADA', label: '📤 Enviar solicitud', color: 'bg-estado-blue' }],
  ENVIADA: [
    { estado: 'APROBADA', label: '✅ Aprobar', color: 'bg-estado-green', permiso: 'aprobar' },
    { estado: 'RECHAZADA', label: '❌ Rechazar', color: 'bg-estado-red', permiso: 'aprobar' },
  ],
  APROBADA: [{ estado: 'PEDIDA', label: '🛒 Marcar pedida', color: 'bg-auro-orange' }],
  PEDIDA: [
    { estado: 'RECIBIDA_PARCIAL', label: '📦 Recepción parcial', color: 'bg-estado-purple' },
    { estado: 'RECIBIDA', label: '✅ Todo recibido', color: 'bg-estado-green' },
  ],
  RECIBIDA_PARCIAL: [{ estado: 'RECIBIDA', label: '✅ Todo recibido', color: 'bg-estado-green' }],
};

const fmt = (cents: number) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export default function MaterialesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [detalle, setDetalle] = useState<Solicitud | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtroEstado ? `?estado=${filtroEstado}` : '';
    const res = await fetch(`/api/materiales${params}`);
    const data = await res.json();
    if (data.ok) setSolicitudes(data.data);
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarEstado(id: string, estado: string) {
    await fetch(`/api/materiales/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    cargar();
    setDetalle(null);
  }

  // KPIs rápidos
  const pendientes = solicitudes.filter(s => ['BORRADOR', 'ENVIADA'].includes(s.estado)).length;
  const enCurso = solicitudes.filter(s => ['APROBADA', 'PEDIDA', 'RECIBIDA_PARCIAL'].includes(s.estado)).length;
  const costeAprobado = solicitudes.filter(s => !['BORRADOR', 'ENVIADA', 'RECHAZADA'].includes(s.estado))
    .reduce((s, sol) => s + sol.costeTotal, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Materiales</h2>
        <button onClick={() => setShowCrear(true)} className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Nueva solicitud
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pendientes aprobación', val: pendientes, icon: '📤', color: 'text-estado-blue' },
          { label: 'En curso', val: enCurso, icon: '🛒', color: 'text-auro-orange' },
          { label: 'Coste aprobado', val: fmt(costeAprobado), icon: '💰', color: 'text-estado-green' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-card border border-auro-border p-4">
            <div className="text-lg mb-1">{k.icon}</div>
            <div className={`text-xl font-extrabold ${k.color}`}>{k.val}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[{ key: '', label: 'Todas' }, ...Object.entries(ESTADOS_MAT).map(([key, cfg]) => ({ key, label: cfg.label }))].map(f => (
          <button key={f.key} onClick={() => setFiltroEstado(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroEstado === f.key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">No hay solicitudes</div>
      ) : (
        <div className="space-y-2">
          {solicitudes.map(sol => {
            const est = ESTADOS_MAT[sol.estado] || ESTADOS_MAT.BORRADOR;
            return (
              <div key={sol.id} onClick={() => setDetalle(sol)}
                className="bg-white rounded-card border border-auro-border p-4 hover:border-auro-orange/30 cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-auro-navy">{sol.obra.codigo}</span>
                    <span className="text-xs text-auro-navy/40">· {sol.obra.cliente.nombre} {sol.obra.cliente.apellidos}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${est.color}`}>
                    {est.icon} {est.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-auro-navy/40">
                  <div className="flex gap-3">
                    <span>📦 {sol.lineas.length} línea{sol.lineas.length > 1 ? 's' : ''}</span>
                    {sol.proveedor && <span>🏭 {sol.proveedor}</span>}
                  </div>
                  <span className="font-bold text-auro-navy">{fmt(sol.costeTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold">{detalle.obra.codigo}</h3>
                  <p className="text-xs text-auro-navy/40">{detalle.obra.cliente.nombre} {detalle.obra.cliente.apellidos}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${ESTADOS_MAT[detalle.estado]?.color}`}>
                  {ESTADOS_MAT[detalle.estado]?.icon} {ESTADOS_MAT[detalle.estado]?.label}
                </span>
              </div>

              {detalle.proveedor && <div className="text-xs text-auro-navy/50 mb-1">🏭 Proveedor: <strong>{detalle.proveedor}</strong></div>}
              {detalle.notas && <div className="text-xs text-auro-navy/40 mb-3 italic">{detalle.notas}</div>}

              {/* Líneas */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">Líneas de material</div>
                <div className="space-y-1.5">
                  {detalle.lineas.map(l => (
                    <div key={l.id} className="flex items-center justify-between bg-auro-surface-2 rounded-xl p-2.5">
                      <div>
                        <div className="text-xs font-semibold">{l.producto}</div>
                        <div className="text-[10px] text-auro-navy/40">
                          {l.cantidad} uds × {fmt(l.costeUnitario)}
                          {l.recibido > 0 && <span className="text-estado-green ml-2">· Recibido: {l.recibido}/{l.cantidad}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-bold">{fmt(l.cantidad * l.costeUnitario)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2 pr-2.5">
                  <span className="text-sm font-extrabold text-auro-navy">Total: {fmt(detalle.costeTotal)}</span>
                </div>
              </div>

              {/* Acciones */}
              {ACCIONES[detalle.estado] && (
                <div className="flex gap-2">
                  {ACCIONES[detalle.estado].map(a => (
                    <button key={a.estado} onClick={() => cambiarEstado(detalle.id, a.estado)}
                      className={`flex-1 h-10 ${a.color} text-white text-xs font-bold rounded-button transition-opacity hover:opacity-90`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCrear && <CrearSolicitudModal onClose={() => setShowCrear(false)} onCreada={() => { cargar(); setShowCrear(false); }} />}
    </div>
  );
}

// ── Modal crear solicitud ──
function CrearSolicitudModal({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [obras, setObras] = useState<Array<{ id: string; codigo: string }>>([]);
  const [obraId, setObraId] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState([{ producto: '', cantidad: 1, costeUnitario: 0 }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.map((o: any) => ({ id: o.id, codigo: o.codigo })));
    });
  }, []);

  function addLinea() {
    setLineas([...lineas, { producto: '', cantidad: 1, costeUnitario: 0 }]);
  }

  function updateLinea(idx: number, field: string, value: any) {
    setLineas(lineas.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function removeLinea(idx: number) {
    if (lineas.length > 1) setLineas(lineas.filter((_, i) => i !== idx));
  }

  const total = lineas.reduce((s, l) => s + l.cantidad * l.costeUnitario, 0);

  async function guardar() {
    if (!obraId || lineas.some(l => !l.producto)) { setError('Rellena obra y productos'); return; }
    setGuardando(true); setError('');
    const body = {
      obraId, proveedor: proveedor || undefined, notas: notas || undefined,
      lineas: lineas.map(l => ({ ...l, costeUnitario: Math.round(l.costeUnitario * 100), cantidad: l.cantidad })),
    };
    const res = await fetch('/api/materiales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) onCreada();
    else setError(data.error || 'Error');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">Nueva solicitud de material</h3>
          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Obra</label>
            <select value={obraId} onChange={e => setObraId(e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
              <option value="">Selecciona obra...</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.codigo}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Proveedor</label>
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="ej: SunFields, Krannich..."
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          {/* Líneas */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-auro-navy/30 uppercase">Líneas</label>
              <button onClick={addLinea} className="text-[10px] font-bold text-auro-orange">+ Añadir línea</button>
            </div>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="bg-auro-surface-2 rounded-xl p-2.5">
                  <div className="flex gap-2 mb-1.5">
                    <input value={l.producto} onChange={e => updateLinea(i, 'producto', e.target.value)} placeholder="Producto"
                      className="flex-1 h-9 px-2.5 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40" />
                    {lineas.length > 1 && (
                      <button onClick={() => removeLinea(i)} className="w-9 h-9 text-estado-red text-xs rounded-lg border border-auro-border hover:bg-estado-red/10">✕</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-auro-navy/25 uppercase">Cantidad</label>
                      <input type="number" value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', parseInt(e.target.value) || 0)} min={1}
                        className="w-full h-8 px-2 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-auro-navy/25 uppercase">€/ud</label>
                      <input type="number" value={l.costeUnitario} onChange={e => updateLinea(i, 'costeUnitario', parseFloat(e.target.value) || 0)} step="0.01"
                        className="w-full h-8 px-2 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40" />
                    </div>
                    <div className="flex-1 text-right pt-3">
                      <span className="text-xs font-bold">{(l.cantidad * l.costeUnitario).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-sm font-extrabold text-auro-navy">Total: {total.toFixed(2)}€</div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas adicionales..."
              className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40" />
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Creando...' : '📦 Crear solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}
