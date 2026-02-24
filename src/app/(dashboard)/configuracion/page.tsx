// src/app/(dashboard)/configuracion/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface CatItem {
  id: string; tipo: string; codigo: string; nombre: string;
  orden: number; activo: boolean; metadata: string | null;
}

interface Stats {
  usuarios: number; obras: number; leads: number;
  incidencias: number; activos: number; notificaciones: number;
}

const TIPO_LABELS: Record<string, { label: string; icon: string }> = {
  TIPO_INSTALACION: { label: 'Tipos de instalación', icon: '🏠' },
  METODO_PAGO: { label: 'Métodos de pago', icon: '💳' },
  ORIGEN_LEAD: { label: 'Orígenes de lead', icon: '📞' },
  GRAVEDAD_INCIDENCIA: { label: 'Gravedades incidencia', icon: '⚠️' },
  TIPO_ACTIVO: { label: 'Tipos de activo', icon: '🔋' },
};

export default function ConfiguracionPage() {
  const [catalogos, setCatalogos] = useState<CatItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoActivo, setTipoActivo] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<CatItem | null>(null);
  const [seeding, setSeeding] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = tipoActivo ? `?tipo=${tipoActivo}` : '';
    const [resCat, resStats] = await Promise.all([
      fetch(`/api/configuracion${params}`).then(r => r.json()),
      fetch('/api/configuracion/stats').then(r => r.json()),
    ]);
    if (resCat.ok) setCatalogos(resCat.data);
    if (resStats.ok) setStats(resStats.data);
    setLoading(false);
  }, [tipoActivo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar por tipo
  const grupos = catalogos.reduce<Record<string, CatItem[]>>((acc, c) => {
    if (!acc[c.tipo]) acc[c.tipo] = [];
    acc[c.tipo].push(c);
    return acc;
  }, {});

  async function toggleActivo(item: CatItem) {
    await fetch(`/api/configuracion/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !item.activo }),
    });
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta entrada?')) return;
    await fetch(`/api/configuracion/${id}`, { method: 'DELETE' });
    cargar();
  }

  async function seedDefaults() {
    setSeeding(true);
    await fetch('/api/configuracion/seed', { method: 'POST' });
    await cargar();
    setSeeding(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Configuración</h2>
        <div className="flex gap-2">
          <button onClick={seedDefaults} disabled={seeding}
            className="h-9 px-3 bg-auro-surface-2 hover:bg-auro-surface-3 text-xs font-semibold text-auro-navy/50 rounded-button border border-auro-border transition-colors disabled:opacity-50">
            {seeding ? 'Cargando...' : '🌱 Cargar catálogos'}
          </button>
          <button onClick={() => setShowCrear(true)}
            className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
            + Nueva entrada
          </button>
        </div>
      </div>

      {/* Stats del sistema */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
          {[
            { label: 'Usuarios', val: stats.usuarios, icon: '👥' },
            { label: 'Obras', val: stats.obras, icon: '🏗️' },
            { label: 'Leads', val: stats.leads, icon: '📞' },
            { label: 'Incidencias', val: stats.incidencias, icon: '⚠️' },
            { label: 'Activos', val: stats.activos, icon: '🔋' },
            { label: 'Notificaciones', val: stats.notificaciones, icon: '🔔' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-card border border-auro-border p-3 text-center">
              <div className="text-base mb-0.5">{s.icon}</div>
              <div className="text-lg font-extrabold text-auro-navy">{s.val}</div>
              <div className="text-[9px] text-auro-navy/30 font-semibold uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por tipo */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTipoActivo('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${!tipoActivo ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
          Todos
        </button>
        {Object.entries(TIPO_LABELS).map(([key, cfg]) => (
          <button key={key} onClick={() => setTipoActivo(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${tipoActivo === key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Catálogos agrupados */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : Object.keys(grupos).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm text-auro-navy/30 mb-3">No hay catálogos configurados</div>
          <button onClick={seedDefaults} className="h-9 px-4 bg-auro-orange text-white text-sm font-bold rounded-button">
            🌱 Cargar valores por defecto
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([tipo, items]) => {
            const tipoCfg = TIPO_LABELS[tipo] || { label: tipo, icon: '📋' };
            return (
              <div key={tipo} className="bg-white rounded-card border border-auro-border overflow-hidden">
                <div className="px-4 py-3 border-b border-auro-border bg-auro-surface-2/50 flex items-center gap-2">
                  <span className="text-base">{tipoCfg.icon}</span>
                  <span className="text-xs font-bold text-auro-navy">{tipoCfg.label}</span>
                  <span className="text-[10px] text-auro-navy/30 bg-auro-surface-2 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="divide-y divide-auro-border/50">
                  {items.sort((a, b) => a.orden - b.orden).map(item => (
                    <div key={item.id} className={`px-4 py-2.5 flex items-center gap-3 ${!item.activo ? 'opacity-30' : ''}`}>
                      <span className="text-xs font-mono text-auro-navy/25 w-6 text-center">{item.orden}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold">{item.nombre}</span>
                        <span className="text-[10px] text-auro-navy/25 ml-2">{item.codigo}</span>
                      </div>
                      <button onClick={() => toggleActivo(item)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.activo ? 'bg-estado-green/10 text-estado-green' : 'bg-estado-red/10 text-estado-red'}`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </button>
                      <button onClick={() => setEditando(item)} className="text-[10px] font-semibold text-auro-orange hover:underline">Editar</button>
                      <button onClick={() => eliminar(item.id)} className="text-[10px] text-estado-red/50 hover:text-estado-red">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info versión */}
      <div className="mt-6 text-center text-[10px] text-auro-navy/20">
        Auro Solar ERP v2.0 · Next.js 14 · PostgreSQL · 131 archivos
      </div>

      {showCrear && <CatModal onClose={() => setShowCrear(false)} onGuardado={() => { cargar(); setShowCrear(false); }} />}
      {editando && <CatModal item={editando} onClose={() => setEditando(null)} onGuardado={() => { cargar(); setEditando(null); }} />}
    </div>
  );
}

function CatModal({ item, onClose, onGuardado }: { item?: CatItem; onClose: () => void; onGuardado: () => void }) {
  const esEditar = !!item;
  const [form, setForm] = useState({
    tipo: item?.tipo || '', codigo: item?.codigo || '',
    nombre: item?.nombre || '', orden: String(item?.orden ?? 0),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre || (!esEditar && (!form.tipo || !form.codigo))) {
      setError('Rellena todos los campos'); return;
    }
    setGuardando(true); setError('');
    const url = esEditar ? `/api/configuracion/${item!.id}` : '/api/configuracion';
    const method = esEditar ? 'PATCH' : 'POST';
    const body = esEditar
      ? { nombre: form.nombre, orden: parseInt(form.orden) || 0 }
      : { ...form, orden: parseInt(form.orden) || 0 };
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.ok) onGuardado();
    else setError(data.error || 'Error');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">{esEditar ? 'Editar entrada' : 'Nueva entrada de catálogo'}</h3>
          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          {!esEditar && (
            <>
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
                  <option value="">Selecciona tipo...</option>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  <option value="CUSTOM">+ Tipo personalizado</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Código</label>
                <input value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} placeholder="ej: RESIDENCIAL"
                  className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm font-mono focus:outline-none focus:border-auro-orange/40" />
              </div>
            </>
          )}

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nombre</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Orden</label>
            <input type="number" value={form.orden} onChange={e => set('orden', e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : '+ Crear entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}
