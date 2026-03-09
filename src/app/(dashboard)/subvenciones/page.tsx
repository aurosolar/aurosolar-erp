// src/app/(dashboard)/subvenciones/page.tsx
'use client';
import BuscadorObras from '@/components/ui/BuscadorObras';
import { useState, useEffect, useCallback } from 'react';

interface Subvencion {
  id: string; tipo: string; estado: string; programa: string | null;
  convocatoria: string | null; expediente: string | null;
  importeSolicitado: number; importeAprobado: number | null; importeCobrado: number | null;
  fechaSolicitud: string | null; fechaAprobacion: string | null; fechaCobro: string | null;
  fechaLimite: string | null; notas: string | null; createdAt: string;
  obra: { codigo: string; cliente: { nombre: string; apellidos: string } };
  responsable: { nombre: string; apellidos: string } | null;
}

interface Resumen {
  total: number; importeSolicitado: number; importeAprobado: number;
  importeCobrado: number; proximasACaducar: number;
  porEstado: Array<{ estado: string; count: number }>;
}

const ESTADOS: Record<string, { label: string; color: string; icon: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-gray-100 text-gray-600', icon: '⏳' },
  SOLICITADA: { label: 'Solicitada', color: 'bg-blue-50 text-blue-600', icon: '📤' },
  EN_TRAMITE: { label: 'En trámite', color: 'bg-yellow-50 text-yellow-700', icon: '⏱️' },
  APROBADA: { label: 'Aprobada', color: 'bg-green-50 text-green-600', icon: '✅' },
  DENEGADA: { label: 'Denegada', color: 'bg-red-50 text-red-600', icon: '❌' },
  COBRADA: { label: 'Cobrada', color: 'bg-emerald-50 text-emerald-700', icon: '💰' },
  CADUCADA: { label: 'Caducada', color: 'bg-gray-50 text-gray-400', icon: '⌛' },
};

const TIPOS: Record<string, { label: string; icon: string }> = {
  NEXT_GENERATION: { label: 'Next Generation', icon: '🇪🇺' },
  AUTOCONSUMO_CCAA: { label: 'Autoconsumo CCAA', icon: '🏛️' },
  PLAN_MOVES: { label: 'Plan MOVES', icon: '🔋' },
  IDAE: { label: 'IDAE', icon: '⚡' },
  MUNICIPAL: { label: 'Municipal', icon: '🏘️' },
  OTRA: { label: 'Otra', icon: '📋' },
};

const fmtMoney = (cents: number) => `${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€`;

export default function SubvencionesPage() {
  const [subs, setSubs] = useState<Subvencion[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Subvencion | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtroEstado ? `?estado=${filtroEstado}` : '';
    const [rSubs, rResumen] = await Promise.all([
      fetch(`/api/subvenciones${params}`).then(r => r.json()),
      fetch('/api/subvenciones/resumen').then(r => r.json()),
    ]);
    if (rSubs.ok) setSubs(Array.isArray(rSubs.data) ? rSubs.data : rSubs.data.data || []);
    if (rResumen.ok) setResumen(rResumen.data);
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const diasHastaLimite = (fecha: string | null) => {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Subvenciones</h2>
        <button onClick={() => setShowCrear(true)}
          className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Nueva subvención
        </button>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">🏛️</div>
            <div className="text-2xl font-extrabold text-auro-navy">{resumen.total}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">📤</div>
            <div className="text-2xl font-extrabold text-estado-blue">{fmtMoney(resumen.importeSolicitado)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Solicitado</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">✅</div>
            <div className="text-2xl font-extrabold text-estado-green">{fmtMoney(resumen.importeAprobado)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Aprobado</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">💰</div>
            <div className="text-2xl font-extrabold text-estado-green">{fmtMoney(resumen.importeCobrado)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Cobrado</div>
          </div>
        </div>
      )}

      {/* Alerta caducidad */}
      {resumen && resumen.proximasACaducar > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
          <span className="text-sm">⏰</span>
          <span className="text-xs font-semibold text-red-700">
            {resumen.proximasACaducar} subvención{resumen.proximasACaducar > 1 ? 'es' : ''} con fecha límite en los próximos 30 días
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[{ key: '', label: 'Todas' }, ...Object.entries(ESTADOS).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))].map(f => (
          <button key={f.key} onClick={() => setFiltroEstado(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroEstado === f.key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">Sin subvenciones registradas</div>
      ) : (
        <div className="space-y-1.5">
          {subs.map(s => {
            const est = ESTADOS[s.estado] || ESTADOS.PENDIENTE;
            const tipo = TIPOS[s.tipo] || TIPOS.OTRA;
            const dias = diasHastaLimite(s.fechaLimite);
            return (
              <button key={s.id} onClick={() => setEditando(s)}
                className="w-full bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3 text-left hover:border-auro-orange/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-auro-surface-2 flex items-center justify-center text-lg shrink-0">
                  {tipo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {tipo.label} {s.programa && `— ${s.programa}`}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-auro-navy/30 mt-0.5">
                    <span>🏗️ {s.obra.codigo}</span>
                    <span>👤 {s.obra.cliente.nombre}</span>
                    {s.expediente && <span>📋 {s.expediente}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${est.color}`}>
                    {est.icon} {est.label}
                  </span>
                  <span className="text-xs font-bold text-auro-navy/60">{fmtMoney(s.importeSolicitado)}</span>
                  {dias !== null && dias <= 30 && dias > 0 && (
                    <span className="text-[9px] text-red-500 font-semibold">⏰ {dias}d límite</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCrear && <FormSubvencion onClose={() => setShowCrear(false)} onGuardado={() => { setShowCrear(false); cargar(); }} />}
      {editando && <DetalleSubvencion sub={editando} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}

function FormSubvencion({ onClose, onGuardado }: { onClose: () => void; onGuardado: () => void }) {
  const [form, setForm] = useState({ obraId: '', tipo: 'NEXT_GENERATION', programa: '', convocatoria: '', importeSolicitado: '', fechaLimite: '', notas: '' });
  const [guardando, setGuardando] = useState(false);


  const onChange = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function guardar() {
    if (!form.obraId || !form.importeSolicitado) return;
    setGuardando(true);
    await fetch('/api/subvenciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({
        ...form,
        importeSolicitado: Math.round(parseFloat(form.importeSolicitado) * 100),
        fechaLimite: form.fechaLimite || undefined,
      }),
    });
    setGuardando(false);
    onGuardado();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">🏛️ Nueva subvención</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Obra</label>
  <div>
              <BuscadorObras value={form.obraId} onChange={v => onChange('obraId', v)} />
            </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Tipo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(TIPOS).map(([k, v]) => (
                  <button key={k} onClick={() => onChange('tipo', k)}
                    className={`h-9 px-2 rounded-lg text-[10px] font-semibold border-2 transition-all truncate ${form.tipo === k ? 'border-auro-orange bg-auro-orange/10 text-auro-orange' : 'border-auro-border text-auro-navy/40'}`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Programa</label>
                <input value={form.programa} onChange={e => onChange('programa', e.target.value)} placeholder="Ej: Programa 4"
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Convocatoria</label>
                <input value={form.convocatoria} onChange={e => onChange('convocatoria', e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Importe (€) *</label>
                <input type="number" step="0.01" value={form.importeSolicitado} onChange={e => onChange('importeSolicitado', e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Fecha límite</label>
                <input type="date" value={form.fechaLimite} onChange={e => onChange('fechaLimite', e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => onChange('notas', e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none" />
            </div>
          </div>

          <button onClick={guardar} disabled={guardando || !form.obraId || !form.importeSolicitado}
            className="w-full h-11 mt-4 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : '✅ Crear subvención'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleSubvencion({ sub, onClose, onGuardado }: { sub: Subvencion; onClose: () => void; onGuardado: () => void }) {
  const [nuevoEstado, setNuevoEstado] = useState(sub.estado);
  const [expediente, setExpediente] = useState(sub.expediente || '');
  const [importeAprobado, setImporteAprobado] = useState(sub.importeAprobado ? String(sub.importeAprobado / 100) : '');
  const [guardando, setGuardando] = useState(false);

  const est = ESTADOS[sub.estado] || ESTADOS.PENDIENTE;
  const tipo = TIPOS[sub.tipo] || TIPOS.OTRA;

  async function guardar() {
    setGuardando(true);
    await fetch(`/api/subvenciones/${sub.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({
        estado: nuevoEstado,
        expediente: expediente || undefined,
        importeAprobado: importeAprobado ? Math.round(parseFloat(importeAprobado) * 100) : undefined,
      }),
    });
    setGuardando(false);
    onGuardado();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-auro-surface-2 flex items-center justify-center text-lg">{tipo.icon}</div>
            <div>
              <div className="text-sm font-bold">{tipo.label}</div>
              <div className="text-[10px] text-auro-navy/30">{sub.obra.codigo} · {sub.obra.cliente.nombre}</div>
            </div>
            <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${est.color}`}>{est.icon} {est.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div className="bg-auro-surface-2 rounded-lg px-3 py-2">
              <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">📤 Solicitado</div>
              <div className="font-bold mt-0.5">{fmtMoney(sub.importeSolicitado)}</div>
            </div>
            <div className="bg-auro-surface-2 rounded-lg px-3 py-2">
              <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">✅ Aprobado</div>
              <div className="font-bold mt-0.5">{sub.importeAprobado ? fmtMoney(sub.importeAprobado) : '—'}</div>
            </div>
            {sub.programa && <div className="bg-auro-surface-2 rounded-lg px-3 py-2"><div className="text-[9px] text-auro-navy/25 uppercase font-semibold">Programa</div><div className="font-medium mt-0.5">{sub.programa}</div></div>}
            {sub.convocatoria && <div className="bg-auro-surface-2 rounded-lg px-3 py-2"><div className="text-[9px] text-auro-navy/25 uppercase font-semibold">Convocatoria</div><div className="font-medium mt-0.5">{sub.convocatoria}</div></div>}
            {sub.fechaLimite && <div className="bg-auro-surface-2 rounded-lg px-3 py-2 col-span-2"><div className="text-[9px] text-auro-navy/25 uppercase font-semibold">⏰ Fecha límite</div><div className="font-medium mt-0.5">{new Date(sub.fechaLimite).toLocaleDateString('es-ES')}</div></div>}
          </div>

          <div className="border-t border-auro-border pt-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Cambiar estado</label>
              <div className="grid grid-cols-4 gap-1">
                {Object.entries(ESTADOS).map(([k, v]) => (
                  <button key={k} onClick={() => setNuevoEstado(k)}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-semibold border-2 transition-all ${nuevoEstado === k ? 'border-auro-orange bg-auro-orange/10 text-auro-orange' : 'border-auro-border text-auro-navy/30'}`}>
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nº Expediente</label>
                <input value={expediente} onChange={e => setExpediente(e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Importe aprobado (€)</label>
                <input type="number" step="0.01" value={importeAprobado} onChange={e => setImporteAprobado(e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              </div>
            </div>

            <button onClick={guardar} disabled={guardando}
              className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
              {guardando ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
