// src/app/(dashboard)/clientes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Cliente {
  id: string; nombre: string; apellidos: string; dniCif: string | null;
  direccion: string | null; codigoPostal: string | null; localidad: string | null;
  provincia: string | null; telefono: string | null; email: string | null;
  notas: string | null; createdAt: string;
  _count?: { obras: number };
}

interface ClienteDetalle extends Cliente {
  obras: Array<{
    id: string; codigo: string; estado: string; tipo: string;
    presupuesto: number | null; localidad: string | null; createdAt: string;
    pagos: Array<{ importe: number }>;
  }>;
  leads: Array<{
    id: string; estado: string; importeEstimado: number | null; createdAt: string;
  }>;
}

interface Resumen { total: number; conObra: number; sinObra: number }

const ESTADOS_COLOR: Record<string, string> = {
  REVISION: 'bg-gray-100 text-gray-600',
  PRESUPUESTADA: 'bg-blue-50 text-blue-600',
  APROBADA: 'bg-indigo-50 text-indigo-600',
  PREPARANDO: 'bg-yellow-50 text-yellow-700',
  PROGRAMADA: 'bg-purple-50 text-purple-600',
  INSTALANDO: 'bg-orange-50 text-orange-600',
  TERMINADA: 'bg-green-50 text-green-600',
  LEGALIZACION: 'bg-cyan-50 text-cyan-700',
  FINALIZADA: 'bg-emerald-50 text-emerald-700',
  INCIDENCIA: 'bg-red-50 text-red-600',
};

const fmtMoney = (n: number | null) => n != null ? `${n.toLocaleString('es-ES')}€` : '—';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, conObra: 0, sinObra: 0 });
  const [busq, setBusq] = useState('');
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<ClienteDetalle | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = busq ? `?q=${encodeURIComponent(busq)}` : '';
    const [rClientes, rResumen] = await Promise.all([
      fetch(`/api/clientes${params}`).then(r => r.json()),
      fetch('/api/clientes/resumen').then(r => r.json()),
    ]);
    if (rClientes.ok) setClientes(rClientes.data);
    if (rResumen.ok) setResumen(rResumen.data);
    setLoading(false);
  }, [busq]);

  useEffect(() => { cargar(); }, [cargar]);

  async function verDetalle(id: string) {
    const res = await fetch(`/api/clientes/${id}`);
    const data = await res.json();
    if (data.ok) setDetalle(data.data);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Clientes</h2>
        <button onClick={() => setShowCrear(true)}
          className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Nuevo cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">👥</div>
          <div className="text-2xl font-extrabold text-auro-navy">{resumen.total}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total clientes</div>
        </div>
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">🏗️</div>
          <div className="text-2xl font-extrabold text-estado-green">{resumen.conObra}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Con obras</div>
        </div>
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">📋</div>
          <div className="text-2xl font-extrabold text-estado-yellow">{resumen.sinObra}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Sin obras</div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍 Buscar por nombre, DNI/CIF, teléfono, email..."
          className="w-full h-10 pl-4 pr-10 bg-white border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
        {busq && (
          <button onClick={() => setBusq('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-auro-navy/20 hover:text-auro-navy/50 text-sm">✕</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">
          {busq ? 'Sin resultados' : 'No hay clientes registrados'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {clientes.map(c => (
            <button key={c.id} onClick={() => verDetalle(c.id)}
              className="w-full bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3 text-left hover:border-auro-orange/30 transition-colors">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-auro-orange/10 flex items-center justify-center text-sm font-bold text-auro-orange shrink-0">
                {c.nombre.charAt(0)}{c.apellidos?.charAt(0) || ''}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {c.nombre} {c.apellidos}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-auro-navy/30 mt-0.5">
                  {c.dniCif && <span>🪪 {c.dniCif}</span>}
                  {c.localidad && <span>📍 {c.localidad}</span>}
                  {c.telefono && <span>📱 {c.telefono}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-auro-navy/60">{c._count?.obras || 0}</div>
                <div className="text-[9px] text-auro-navy/20">obras</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <DetalleModal cliente={detalle} onClose={() => setDetalle(null)} onEditar={() => { setEditando(detalle); setDetalle(null); }} onRefresh={() => verDetalle(detalle.id)} />
      )}

      {/* Modal crear/editar */}
      {(showCrear || editando) && (
        <FormModal
          cliente={editando || undefined}
          onClose={() => { setShowCrear(false); setEditando(null); }}
          onGuardado={() => { setShowCrear(false); setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ── Modal detalle cliente ──
function DetalleModal({ cliente, onClose, onEditar, onRefresh }: {
  cliente: ClienteDetalle; onClose: () => void; onEditar: () => void; onRefresh: () => void;
}) {
  const totalPresupuestado = cliente.obras.reduce((s, o) => s + (o.presupuesto || 0), 0);
  const totalCobrado = cliente.obras.reduce((s, o) => s + o.pagos.reduce((ps, p) => ps + p.importe, 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-auro-orange/10 flex items-center justify-center text-lg font-bold text-auro-orange">
              {cliente.nombre.charAt(0)}{cliente.apellidos?.charAt(0) || ''}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold">{cliente.nombre} {cliente.apellidos}</h3>
              <div className="text-[10px] text-auro-navy/30">
                Cliente desde {new Date(cliente.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button onClick={onEditar} className="h-8 px-3 bg-auro-surface-2 text-xs font-semibold rounded-lg text-auro-navy/50 hover:bg-auro-orange/10 hover:text-auro-orange transition-colors">
              ✏️ Editar
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2 mb-5 text-xs">
            {[
              { icon: '🪪', label: 'DNI/CIF', value: cliente.dniCif },
              { icon: '📱', label: 'Teléfono', value: cliente.telefono },
              { icon: '📧', label: 'Email', value: cliente.email },
              { icon: '📍', label: 'Dirección', value: [cliente.direccion, cliente.codigoPostal, cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || null },
            ].map((f, i) => f.value && (
              <div key={i} className="bg-auro-surface-2 rounded-lg px-3 py-2">
                <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">{f.icon} {f.label}</div>
                <div className="font-medium text-auro-navy/70 mt-0.5 truncate">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Resumen financiero */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-auro-surface-2 rounded-lg p-3 text-center">
              <div className="text-lg font-extrabold text-auro-navy">{cliente.obras.length}</div>
              <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">Obras</div>
            </div>
            <div className="bg-auro-surface-2 rounded-lg p-3 text-center">
              <div className="text-lg font-extrabold text-estado-blue">{fmtMoney(totalPresupuestado)}</div>
              <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">Presupuestado</div>
            </div>
            <div className="bg-auro-surface-2 rounded-lg p-3 text-center">
              <div className="text-lg font-extrabold text-estado-green">{fmtMoney(totalCobrado)}</div>
              <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">Cobrado</div>
            </div>
          </div>

          {/* Obras del cliente */}
          {cliente.obras.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">🏗️ Obras</h4>
              <div className="space-y-1.5">
                {cliente.obras.map(o => {
                  const cobrado = o.pagos.reduce((s, p) => s + p.importe, 0);
                  const pct = o.presupuesto ? Math.round((cobrado / o.presupuesto) * 100) : 0;
                  return (
                    <div key={o.id} className="flex items-center gap-2 bg-auro-surface-2 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{o.codigo}</div>
                        <div className="text-[10px] text-auro-navy/30">{o.tipo} · {o.localidad || '—'}</div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ESTADOS_COLOR[o.estado] || 'bg-gray-100 text-gray-500'}`}>
                        {o.estado}
                      </span>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold">{fmtMoney(o.presupuesto)}</div>
                        <div className="text-[9px] text-auro-navy/25">{pct}% cobrado</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leads del cliente */}
          {cliente.leads.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">📊 Leads / Oportunidades</h4>
              <div className="space-y-1">
                {cliente.leads.map(l => (
                  <div key={l.id} className="flex items-center justify-between bg-auro-surface-2 rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium">{l.estado}</span>
                    <span className="text-auro-navy/30">{l.importeEstimado ? fmtMoney(l.importeEstimado) : '—'}</span>
                    <span className="text-auro-navy/20">{new Date(l.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {cliente.notas && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-auro-navy/30 uppercase mb-1">📝 Notas</h4>
              <div className="text-xs text-auro-navy/50 bg-auro-surface-2 rounded-lg p-3 whitespace-pre-wrap">{cliente.notas}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal crear/editar ──
function FormModal({ cliente, onClose, onGuardado }: {
  cliente?: ClienteDetalle; onClose: () => void; onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    nombre: cliente?.nombre || '',
    apellidos: cliente?.apellidos || '',
    dniCif: cliente?.dniCif || '',
    telefono: cliente?.telefono || '',
    email: cliente?.email || '',
    direccion: cliente?.direccion || '',
    codigoPostal: cliente?.codigoPostal || '',
    localidad: cliente?.localidad || '',
    provincia: cliente?.provincia || '',
    notas: cliente?.notas || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const onChange = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim()) { setError('Nombre requerido'); return; }
    setGuardando(true);
    setError('');
    const url = cliente ? `/api/clientes/${cliente.id}` : '/api/clientes';
    const method = cliente ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setGuardando(false);
    if (data.ok) onGuardado();
    else setError(data.error || 'Error al guardar');
  }

  const campos = [
    { key: 'nombre', label: 'Nombre', required: true, half: true },
    { key: 'apellidos', label: 'Apellidos', half: true },
    { key: 'dniCif', label: 'DNI / CIF', half: true },
    { key: 'telefono', label: 'Teléfono', half: true },
    { key: 'email', label: 'Email', half: false },
    { key: 'direccion', label: 'Dirección', half: false },
    { key: 'codigoPostal', label: 'Código postal', half: true },
    { key: 'localidad', label: 'Localidad', half: true },
    { key: 'provincia', label: 'Provincia', half: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">{cliente ? '✏️ Editar cliente' : '👤 Nuevo cliente'}</h3>

          <div className="grid grid-cols-2 gap-2.5">
            {campos.map(c => (
              <div key={c.key} className={c.half ? '' : 'col-span-2'}>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">
                  {c.label} {c.required && <span className="text-estado-red">*</span>}
                </label>
                <input value={(form as any)[c.key]} onChange={e => onChange(c.key, e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => onChange('notas', e.target.value)} rows={3}
                className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40 resize-none" />
            </div>
          </div>

          {error && <div className="text-xs text-estado-red mt-2">{error}</div>}

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 mt-4 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : cliente ? '💾 Guardar cambios' : '✅ Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}
