// src/app/(dashboard)/contactos/[id]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contacto {
  id: string; nombre: string; apellidos: string; empresa: string | null;
  telefono: string | null; email: string | null; direccion: string | null;
  localidad: string | null; provincia: string | null; codigoPostal: string | null;
  estado: string; tipoInteres: string | null; origen: string | null;
  comercial: { id: string; nombre: string; apellidos: string } | null;
  cliente: { id: string; nombre: string } | null;
  tratos: Trato[]; tareasCrm: Tarea[]; notasCrm: Nota[]; archivosCrm: Archivo[];
}
interface Trato {
  id: string; titulo: string; estado: string; importe: number | null;
  tipo: string | null; potenciaEstimada: number | null; notas: string | null;
  motivoPerdido: string | null; createdAt: string; fechaCierre: string | null;
  obra: { id: string; codigo: string; estado: string } | null;
}
interface Tarea {
  id: string; tipo: string; titulo: string; descripcion: string | null;
  estado: string; prioridad: string; fechaVencimiento: string | null;
  asignado: { id: string; nombre: string; apellidos: string };
}
interface Nota {
  id: string; contenido: string; fijada: boolean; createdAt: string;
  autor: { id: string; nombre: string; apellidos: string };
}
interface Archivo {
  id: string; nombre: string; descripcion: string | null; createdAt: string;
  subidoPor: { id: string; nombre: string };
}

const EST_CONTACTO: Record<string, { label: string; cls: string }> = {
  POSIBLE_CLIENTE: { label: 'Posible cliente', cls: 'bg-blue-500/15 text-blue-400' },
  CUALIFICADO: { label: 'Cualificado', cls: 'bg-purple-500/15 text-purple-400' },
  CLIENTE: { label: 'Cliente', cls: 'bg-green-500/15 text-green-400' },
  PERDIDO: { label: 'Perdido', cls: 'bg-red-500/15 text-red-400' },
  INACTIVO: { label: 'Inactivo', cls: 'bg-gray-500/15 text-gray-400' },
};

const EST_TRATO: Record<string, { label: string; icon: string; cls: string }> = {
  NUEVO_CONTACTO: { label: 'Nuevo contacto', icon: '🆕', cls: 'border-blue-400/40 bg-blue-500/5' },
  VISITA_AGENDADA: { label: 'Visita agendada', icon: '📅', cls: 'border-indigo-400/40 bg-indigo-500/5' },
  A_LA_ESPERA_PRESUPUESTO: { label: 'Espera presupuesto', icon: '⏳', cls: 'border-yellow-400/40 bg-yellow-500/5' },
  PRESUPUESTO_ENVIADO: { label: 'Presupuesto enviado', icon: '📄', cls: 'border-orange-400/40 bg-orange-500/5' },
  NEGOCIACION: { label: 'Negociación', icon: '🤝', cls: 'border-purple-400/40 bg-purple-500/5' },
  GANADO: { label: 'Ganado', icon: '✅', cls: 'border-green-400/40 bg-green-500/5' },
  PERDIDO: { label: 'Perdido', icon: '❌', cls: 'border-red-400/40 bg-red-500/5' },
};

const TIPOS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};
const ORIGENES: Record<string, string> = {
  WEB: '🌐 Web', RECOMENDACION: '👥 Recomendación', FERIA: '🎪 Feria',
  PUERTA_FRIA: '🚪 Puerta fría', REPETIDOR: '🔁 Repetidor', TELEFONO: '📱 Teléfono', OTRO: '📌 Otro',
};
const PRIO: Record<string, { icon: string; cls: string }> = {
  ALTA: { icon: '🔴', cls: 'text-red-400' }, MEDIA: { icon: '🟡', cls: 'text-yellow-400' }, BAJA: { icon: '🟢', cls: 'text-green-400' },
};
const TIPO_TAREA_ICON: Record<string, string> = {
  LLAMADA: '📞', EMAIL: '📧', REUNION: '🤝', VISITA: '🚗', PRESUPUESTO: '📄', SEGUIMIENTO: '🔄', OTRO: '📌',
};

const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

type Tab = 'info' | 'tratos' | 'tareas' | 'notas' | 'archivos';

export default function ContactoDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [c, setC] = useState<Contacto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('tratos');

  // Forms
  const [showTrato, setShowTrato] = useState(false);
  const [showTarea, setShowTarea] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const [fTrato, setFTrato] = useState({ titulo: '', tipo: '', potenciaEstimada: '', importe: '', notas: '' });
  const [fTarea, setFTarea] = useState({ tipo: 'LLAMADA', titulo: '', descripcion: '', fechaVencimiento: '', prioridad: 'MEDIA' });
  const [motivoPerdido, setMotivoPerdido] = useState('');
  const [showPerdido, setShowPerdido] = useState<string | null>(null);
  const [editInfo, setEditInfo] = useState(false);
  const [fEdit, setFEdit] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contactos/${id}`);
    const d = await res.json();
    if (d.ok) setC(d.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // === Actions ===
  async function crearTrato() {
    const body: any = { contactoId: id, titulo: fTrato.titulo };
    if (fTrato.tipo) body.tipo = fTrato.tipo;
    if (fTrato.potenciaEstimada) body.potenciaEstimada = parseFloat(fTrato.potenciaEstimada);
    if (fTrato.importe) body.importe = Math.round(parseFloat(fTrato.importe) * 100);
    if (fTrato.notas) body.notas = fTrato.notas;
    await fetch('/api/tratos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowTrato(false); setFTrato({ titulo: '', tipo: '', potenciaEstimada: '', importe: '', notas: '' }); cargar();
  }

  async function avanzarTrato(tratoId: string, estado: string) {
    if (estado === 'PERDIDO') { setShowPerdido(tratoId); return; }
    await fetch(`/api/tratos/${tratoId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    cargar();
  }
  async function confirmarPerdido() {
    if (!showPerdido) return;
    await fetch(`/api/tratos/${showPerdido}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'PERDIDO', motivoPerdido }) });
    setShowPerdido(null); setMotivoPerdido(''); cargar();
  }
  async function convertirTrato(tratoId: string) {
    const res = await fetch(`/api/tratos/${tratoId}/convertir`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) { alert(`✅ Obra ${d.data.codigo} creada`); cargar(); } else alert(`Error: ${d.error}`);
  }

  async function crearTarea() {
    const body: any = { contactoId: id, ...fTarea, asignadoId: 'self' };
    if (body.fechaVencimiento) body.fechaVencimiento = new Date(body.fechaVencimiento).toISOString();
    await fetch('/api/tareas-crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowTarea(false); setFTarea({ tipo: 'LLAMADA', titulo: '', descripcion: '', fechaVencimiento: '', prioridad: 'MEDIA' }); cargar();
  }
  async function completarTarea(tareaId: string) {
    await fetch(`/api/tareas-crm/${tareaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'COMPLETADA' }) });
    cargar();
  }

  async function guardarNota() {
    if (!nuevaNota.trim()) return;
    await fetch(`/api/contactos/${id}/notas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contenido: nuevaNota }) });
    setNuevaNota(''); cargar();
  }
  async function fijarNota(notaId: string, fijada: boolean) {
    await fetch(`/api/notas-crm/${notaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fijada }) });
    cargar();
  }
  async function eliminarNota(notaId: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await fetch(`/api/notas-crm/${notaId}`, { method: 'DELETE' }); cargar();
  }

  async function convertirACliente() {
    if (!confirm('¿Convertir a cliente? Se creará ficha de cliente.')) return;
    const res = await fetch(`/api/contactos/${id}/convertir`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) { alert('✅ Cliente creado'); cargar(); } else alert(`Error: ${d.error}`);
  }

  async function guardarEdicion() {
    await fetch(`/api/contactos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fEdit) });
    setEditInfo(false); cargar();
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  if (!c) return <div className="p-8 text-center text-red-400">Contacto no encontrado</div>;

  const ec = EST_CONTACTO[c.estado] || { label: c.estado, cls: 'bg-gray-500/15 text-gray-400' };
  const tratosActivos = c.tratos.filter(t => !['GANADO', 'PERDIDO'].includes(t.estado));
  const tareasP = c.tareasCrm.filter(t => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA');

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'tratos', label: '💼 Tratos', badge: tratosActivos.length },
    { key: 'tareas', label: '✅ Tareas', badge: tareasP.length },
    { key: 'notas', label: '📝 Notas', badge: c.notasCrm.length },
    { key: 'archivos', label: '📎 Archivos', badge: c.archivosCrm.length },
    { key: 'info', label: '📋 Info' },
  ];

  // Next states for trato progression
  const nextEstados = (est: string): string[] => {
    const map: Record<string, string[]> = {
      NUEVO_CONTACTO: ['VISITA_AGENDADA', 'A_LA_ESPERA_PRESUPUESTO', 'PERDIDO'],
      VISITA_AGENDADA: ['A_LA_ESPERA_PRESUPUESTO', 'PRESUPUESTO_ENVIADO', 'PERDIDO'],
      A_LA_ESPERA_PRESUPUESTO: ['PRESUPUESTO_ENVIADO', 'PERDIDO'],
      PRESUPUESTO_ENVIADO: ['NEGOCIACION', 'GANADO', 'PERDIDO'],
      NEGOCIACION: ['GANADO', 'PERDIDO'],
    };
    return map[est] || [];
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="min-w-0">
          <button onClick={() => router.push('/contactos')} className="text-xs text-gray-500 hover:text-white mb-1 inline-block">← Contactos</button>
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">{c.nombre} {c.apellidos}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ec.cls}`}>{ec.label}</span>
            {c.tipoInteres && <span className="text-xs text-gray-400">{TIPOS[c.tipoInteres]} {c.tipoInteres}</span>}
            {c.comercial && <span className="text-xs text-gray-500">👤 {c.comercial.nombre}</span>}
            {c.empresa && <span className="text-xs text-gray-500">🏢 {c.empresa}</span>}
          </div>
          {/* Quick contact */}
          <div className="flex gap-3 mt-2">
            {c.telefono && <a href={`tel:${c.telefono}`} className="text-xs text-blue-400 hover:underline">📞 {c.telefono}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="text-xs text-blue-400 hover:underline">📧 {c.email}</a>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!c.cliente && c.estado !== 'PERDIDO' && (
            <button onClick={convertirACliente} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">
              🔄 → Cliente
            </button>
          )}
          {c.cliente && (
            <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs">✅ Cliente</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 border-b border-gray-700/50 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded-full text-[10px]">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: TRATOS ═══ */}
      {tab === 'tratos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Tratos / Oportunidades</h3>
            <button onClick={() => setShowTrato(true)} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold">+ Nuevo trato</button>
          </div>

          {c.tratos.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">Sin tratos. Crea el primero →</div>
          ) : (
            <div className="space-y-2.5">
              {c.tratos.map(t => {
                const et = EST_TRATO[t.estado] || { label: t.estado, icon: '📋', cls: 'border-gray-600 bg-gray-800' };
                const nexts = nextEstados(t.estado);
                return (
                  <div key={t.id} className={`border rounded-xl p-4 ${et.cls}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{et.icon}</span>
                          <span className="font-semibold text-white text-sm">{t.titulo}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                          <span className="font-medium">{et.label}</span>
                          {t.importe && <span className="font-bold text-orange-400">{fmt(t.importe)}</span>}
                          {t.tipo && <span>{TIPOS[t.tipo]} {t.tipo}</span>}
                          {t.potenciaEstimada && <span>⚡ {t.potenciaEstimada} kWp</span>}
                          <span>{fmtDate(t.createdAt)}</span>
                        </div>
                        {t.notas && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{t.notas}</p>}
                        {t.motivoPerdido && <p className="text-[11px] text-red-400 mt-1">Motivo: {t.motivoPerdido}</p>}
                        {t.obra && (
                          <Link href={`/obras`} className="text-[11px] text-blue-400 hover:underline mt-1 inline-block">
                            🏗️ Obra {t.obra.codigo} ({t.obra.estado})
                          </Link>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1 shrink-0">
                        {nexts.map(ne => {
                          const neCfg = EST_TRATO[ne];
                          return (
                            <button key={ne} onClick={() => avanzarTrato(t.id, ne)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors hover:opacity-80 ${
                                ne === 'PERDIDO' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' :
                                ne === 'GANADO' ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' :
                                'border-gray-600 text-gray-300 hover:bg-gray-700'
                              }`}>
                              {neCfg?.icon} {neCfg?.label}
                            </button>
                          );
                        })}
                        {t.estado === 'GANADO' && !t.obra && (
                          <button onClick={() => convertirTrato(t.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-green-500/30 text-green-400 hover:bg-green-500/10">
                            🏗️ Crear obra
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal nuevo trato */}
          {showTrato && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTrato(false)}>
              <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">Nuevo trato</h3>
                <div className="space-y-3">
                  <input placeholder="Título del trato *" value={fTrato.titulo} onChange={e => setFTrato({...fTrato, titulo: e.target.value})}
                    className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                  <select value={fTrato.tipo} onChange={e => setFTrato({...fTrato, tipo: e.target.value})}
                    className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white">
                    <option value="">Tipo instalación</option>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="kWp estimados" type="number" step="0.1" value={fTrato.potenciaEstimada}
                      onChange={e => setFTrato({...fTrato, potenciaEstimada: e.target.value})}
                      className="h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                    <input placeholder="Importe €" type="number" step="0.01" value={fTrato.importe}
                      onChange={e => setFTrato({...fTrato, importe: e.target.value})}
                      className="h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                  </div>
                  <textarea placeholder="Notas..." rows={2} value={fTrato.notas} onChange={e => setFTrato({...fTrato, notas: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white resize-none" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowTrato(false)} className="flex-1 h-10 border border-gray-600 rounded-lg text-sm text-gray-300">Cancelar</button>
                  <button onClick={crearTrato} disabled={!fTrato.titulo}
                    className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm text-white font-semibold disabled:opacity-40">Crear</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal perdido */}
          {showPerdido && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPerdido(null)}>
              <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-sm border border-gray-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-3">❌ Marcar como perdido</h3>
                <textarea placeholder="Motivo (opcional)" rows={3} value={motivoPerdido} onChange={e => setMotivoPerdido(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white resize-none mb-4" />
                <div className="flex gap-2">
                  <button onClick={() => setShowPerdido(null)} className="flex-1 h-10 border border-gray-600 rounded-lg text-sm text-gray-300">Cancelar</button>
                  <button onClick={confirmarPerdido} className="flex-1 h-10 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white font-semibold">Confirmar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: TAREAS ═══ */}
      {tab === 'tareas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Tareas</h3>
            <button onClick={() => setShowTarea(true)} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold">+ Nueva tarea</button>
          </div>

          {c.tareasCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">Sin tareas</div>
          ) : (
            <div className="space-y-1.5">
              {c.tareasCrm.map(t => {
                const done = t.estado === 'COMPLETADA';
                const p = PRIO[t.prioridad] || PRIO.MEDIA;
                const vencida = t.fechaVencimiento && !done && new Date(t.fechaVencimiento) < new Date();
                return (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    done ? 'border-gray-700/30 bg-gray-800/30 opacity-60' : vencida ? 'border-red-500/30 bg-red-500/5' : 'border-gray-700 bg-gray-800/50'
                  }`}>
                    <button onClick={() => !done && completarTarea(t.id)}
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 hover:border-green-400'
                      }`}>
                      {done && <span className="text-[10px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${done ? 'line-through text-gray-500' : 'text-white'}`}>
                        {TIPO_TAREA_ICON[t.tipo]} {t.titulo}
                      </div>
                      <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className={p.cls}>{p.icon} {t.prioridad}</span>
                        {t.fechaVencimiento && <span className={vencida ? 'text-red-400 font-semibold' : ''}>{fmtDate(t.fechaVencimiento)}</span>}
                        <span>→ {t.asignado.nombre}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal nueva tarea */}
          {showTarea && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTarea(false)}>
              <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">Nueva tarea</h3>
                <div className="space-y-3">
                  <select value={fTarea.tipo} onChange={e => setFTarea({...fTarea, tipo: e.target.value})}
                    className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white">
                    {Object.entries(TIPO_TAREA_ICON).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                  </select>
                  <input placeholder="Título *" value={fTarea.titulo} onChange={e => setFTarea({...fTarea, titulo: e.target.value})}
                    className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                  <textarea placeholder="Descripción..." rows={2} value={fTarea.descripcion} onChange={e => setFTarea({...fTarea, descripcion: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={fTarea.fechaVencimiento} onChange={e => setFTarea({...fTarea, fechaVencimiento: e.target.value})}
                      className="h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" />
                    <select value={fTarea.prioridad} onChange={e => setFTarea({...fTarea, prioridad: e.target.value})}
                      className="h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white">
                      <option value="ALTA">🔴 Alta</option><option value="MEDIA">🟡 Media</option><option value="BAJA">🟢 Baja</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowTarea(false)} className="flex-1 h-10 border border-gray-600 rounded-lg text-sm text-gray-300">Cancelar</button>
                  <button onClick={crearTarea} disabled={!fTarea.titulo}
                    className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm text-white font-semibold disabled:opacity-40">Crear</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: NOTAS ═══ */}
      {tab === 'notas' && (
        <div>
          {/* Input nueva nota */}
          <div className="mb-4 flex gap-2">
            <textarea placeholder="Añadir nota..." rows={2} value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white resize-none focus:border-orange-500/50 focus:outline-none" />
            <button onClick={guardarNota} disabled={!nuevaNota.trim()}
              className="px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 self-end h-10">
              Guardar
            </button>
          </div>

          {c.notasCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">Sin notas</div>
          ) : (
            <div className="space-y-2">
              {c.notasCrm.map(n => (
                <div key={n.id} className={`p-3 rounded-xl border ${n.fijada ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap flex-1">{n.contenido}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => fijarNota(n.id, !n.fijada)} className="text-xs hover:opacity-70" title={n.fijada ? 'Desfijar' : 'Fijar'}>
                        {n.fijada ? '📌' : '📍'}
                      </button>
                      <button onClick={() => eliminarNota(n.id)} className="text-xs text-red-400 hover:opacity-70">🗑️</button>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1.5">{n.autor.nombre} {n.autor.apellidos} · {fmtTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: ARCHIVOS ═══ */}
      {tab === 'archivos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Archivos adjuntos</h3>
            <span className="text-[10px] text-gray-600">Subida de archivos próximamente</span>
          </div>
          {c.archivosCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">Sin archivos</div>
          ) : (
            <div className="space-y-1.5">
              {c.archivosCrm.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-gray-800/50">
                  <span className="text-xl">📎</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{a.nombre}</div>
                    <div className="text-[10px] text-gray-500">{a.subidoPor.nombre} · {fmtDate(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: INFO ═══ */}
      {tab === 'info' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Datos del contacto</h3>
            {!editInfo ? (
              <button onClick={() => { setEditInfo(true); setFEdit({
                nombre: c.nombre, apellidos: c.apellidos, empresa: c.empresa || '',
                telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '',
                localidad: c.localidad || '', provincia: c.provincia || '', codigoPostal: c.codigoPostal || '',
              }); }} className="px-3 py-1.5 border border-gray-600 rounded-lg text-xs text-gray-300 hover:bg-gray-700">✏️ Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditInfo(false)} className="px-3 py-1.5 border border-gray-600 rounded-lg text-xs text-gray-400">Cancelar</button>
                <button onClick={guardarEdicion} className="px-3 py-1.5 bg-orange-600 rounded-lg text-xs text-white font-semibold">Guardar</button>
              </div>
            )}
          </div>

          {editInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { k: 'nombre', label: 'Nombre' }, { k: 'apellidos', label: 'Apellidos' },
                { k: 'empresa', label: 'Empresa' }, { k: 'telefono', label: 'Teléfono' },
                { k: 'email', label: 'Email' }, { k: 'direccion', label: 'Dirección' },
                { k: 'localidad', label: 'Localidad' }, { k: 'provincia', label: 'Provincia' },
                { k: 'codigoPostal', label: 'Código postal' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</label>
                  <input value={fEdit[f.k] || ''} onChange={e => setFEdit({...fEdit, [f.k]: e.target.value})}
                    className="w-full h-9 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white mt-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
              {[
                { label: 'Nombre', val: `${c.nombre} ${c.apellidos}` },
                { label: 'Empresa', val: c.empresa },
                { label: 'Teléfono', val: c.telefono },
                { label: 'Email', val: c.email },
                { label: 'Dirección', val: c.direccion },
                { label: 'Localidad', val: [c.localidad, c.provincia, c.codigoPostal].filter(Boolean).join(', ') || null },
                { label: 'Origen', val: c.origen ? ORIGENES[c.origen] || c.origen : null },
                { label: 'Interés', val: c.tipoInteres ? `${TIPOS[c.tipoInteres]} ${c.tipoInteres}` : null },
                { label: 'Comercial', val: c.comercial ? `${c.comercial.nombre} ${c.comercial.apellidos}` : null },
              ].filter(f => f.val).map(f => (
                <div key={f.label}>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</div>
                  <div className="text-sm text-gray-200">{f.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
