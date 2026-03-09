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
  POSIBLE_CLIENTE: { label: 'Posible cliente', cls: 'bg-blue-100 text-blue-700' },
  CUALIFICADO: { label: 'Cualificado', cls: 'bg-purple-100 text-purple-700' },
  CLIENTE: { label: 'Cliente', cls: 'bg-green-100 text-green-700' },
  PERDIDO: { label: 'Perdido', cls: 'bg-red-100 text-red-700' },
  INACTIVO: { label: 'Inactivo', cls: 'bg-gray-100 text-gray-600' },
};

const EST_TRATO: Record<string, { label: string; icon: string; cls: string }> = {
  NUEVO_CONTACTO: { label: 'Nuevo contacto', icon: '🆕', cls: 'border-blue-200 bg-blue-50' },
  VISITA_AGENDADA: { label: 'Visita agendada', icon: '📅', cls: 'border-indigo-200 bg-indigo-50' },
  A_LA_ESPERA_PRESUPUESTO: { label: 'Espera presupuesto', icon: '⏳', cls: 'border-yellow-200 bg-yellow-50' },
  PRESUPUESTO_ENVIADO: { label: 'Presupuesto enviado', icon: '📄', cls: 'border-orange-200 bg-orange-50' },
  NEGOCIACION: { label: 'Negociación', icon: '🤝', cls: 'border-purple-200 bg-purple-50' },
  GANADO: { label: 'Ganado', icon: '✅', cls: 'border-green-200 bg-green-50' },
  PERDIDO: { label: 'Perdido', icon: '❌', cls: 'border-red-200 bg-red-50' },
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
  URGENTE: { icon: '🔴', cls: 'text-red-600' }, ALTA: { icon: '🟠', cls: 'text-orange-600' },
  MEDIA: { icon: '🟡', cls: 'text-yellow-600' }, BAJA: { icon: '🟢', cls: 'text-green-600' },
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

  async function crearTrato() {
    const body: any = { contactoId: id, titulo: fTrato.titulo };
    if (fTrato.tipo) body.tipo = fTrato.tipo;
    if (fTrato.potenciaEstimada) body.potenciaEstimada = parseFloat(fTrato.potenciaEstimada);
    if (fTrato.importe) body.importe = Math.round(parseFloat(fTrato.importe) * 100);
    if (fTrato.notas) body.notas = fTrato.notas;
    await fetch('/api/tratos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify(body) });
    setShowTrato(false); setFTrato({ titulo: '', tipo: '', potenciaEstimada: '', importe: '', notas: '' }); cargar();
  }

  async function avanzarTrato(tratoId: string, estado: string) {
    if (estado === 'PERDIDO') { setShowPerdido(tratoId); return; }
    await fetch(`/api/tratos/${tratoId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify({ estado }) });
    cargar();
  }
  async function confirmarPerdido() {
    if (!showPerdido) return;
    await fetch(`/api/tratos/${showPerdido}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify({ estado: 'PERDIDO', motivoPerdido }) });
    setShowPerdido(null); setMotivoPerdido(''); cargar();
  }
  async function convertirTrato(tratoId: string) {
    const res = await fetch(`/api/tratos/${tratoId}/convertir`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) { alert(`Obra ${d.data.codigo} creada`); cargar(); } else alert(`Error: ${d.error}`);
  }

  async function crearTarea() {
    const body: any = { contactoId: id, ...fTarea, asignadoId: 'self' };
    if (body.fechaVencimiento) body.fechaVencimiento = new Date(body.fechaVencimiento).toISOString();
    await fetch('/api/tareas-crm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify(body) });
    setShowTarea(false); setFTarea({ tipo: 'LLAMADA', titulo: '', descripcion: '', fechaVencimiento: '', prioridad: 'MEDIA' }); cargar();
  }
  async function completarTarea(tareaId: string) {
    await fetch(`/api/tareas-crm/${tareaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify({ estado: 'COMPLETADA' }) });
    cargar();
  }

  async function guardarNota() {
    if (!nuevaNota.trim()) return;
    await fetch(`/api/contactos/${id}/notas`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify({ contenido: nuevaNota }) });
    setNuevaNota(''); cargar();
  }
  async function fijarNota(notaId: string, fijada: boolean) {
    await fetch(`/api/notas-crm/${notaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify({ fijada }) });
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
    if (d.ok) { alert('Cliente creado'); cargar(); } else alert(`Error: ${d.error}`);
  }

  async function guardarEdicion() {
    await fetch(`/api/contactos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' }, body: JSON.stringify(fEdit) });
    setEditInfo(false); cargar();
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>;
  if (!c) return <div className="p-8 text-center text-estado-red">Contacto no encontrado</div>;

  const ec = EST_CONTACTO[c.estado] || { label: c.estado, cls: 'bg-gray-100 text-gray-600' };
  const tratosActivos = c.tratos.filter(t => !['GANADO', 'PERDIDO'].includes(t.estado));
  const tareasP = c.tareasCrm.filter(t => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA');

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'tratos', label: '💼 Tratos', badge: tratosActivos.length },
    { key: 'tareas', label: '✅ Tareas', badge: tareasP.length },
    { key: 'notas', label: '📝 Notas', badge: c.notasCrm.length },
    { key: 'archivos', label: '📎 Archivos', badge: c.archivosCrm.length },
    { key: 'info', label: '📋 Info' },
  ];

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

  const inputCls = "w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm text-auro-navy focus:outline-none focus:ring-2 focus:ring-auro-orange/30";
  const btnPrimary = "bg-auro-orange hover:bg-auro-orange-dark text-white rounded-button text-xs font-semibold transition-colors";
  const btnSecondary = "border border-auro-border rounded-button text-xs text-gray-500 hover:bg-gray-50 transition-colors";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="min-w-0">
          <button onClick={() => router.push('/contactos')} className="text-xs text-gray-400 hover:text-auro-orange mb-1 inline-block">← Contactos</button>
          <h1 className="text-xl md:text-2xl font-bold text-auro-navy truncate">{c.nombre} {c.apellidos}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`px-2.5 py-0.5 rounded-badge text-[11px] font-semibold ${ec.cls}`}>{ec.label}</span>
            {c.tipoInteres && <span className="text-xs text-gray-500">{TIPOS[c.tipoInteres]} {c.tipoInteres}</span>}
            {c.comercial && <span className="text-xs text-gray-400">👤 {c.comercial.nombre}</span>}
            {c.empresa && <span className="text-xs text-gray-400">🏢 {c.empresa}</span>}
          </div>
          <div className="flex gap-3 mt-2">
            {c.telefono && <a href={`tel:${c.telefono}`} className="text-xs text-estado-blue hover:underline">📞 {c.telefono}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="text-xs text-estado-blue hover:underline">📧 {c.email}</a>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!c.cliente && c.estado !== 'PERDIDO' && (
            <button onClick={convertirACliente} className={`px-3 py-1.5 ${btnPrimary} bg-estado-green hover:bg-green-700`}>🔄 → Cliente</button>
          )}
          {c.cliente && (
            <span className="px-3 py-1.5 bg-green-100 text-estado-green rounded-button text-xs font-semibold">✅ Cliente</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 border-b border-auro-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? 'border-auro-orange text-auro-orange' : 'border-transparent text-gray-400 hover:text-auro-navy'
            }`}>
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-auro-surface-3 rounded-full text-[10px] text-gray-500">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: TRATOS */}
      {tab === 'tratos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-500">Tratos / Oportunidades</h3>
            <button onClick={() => setShowTrato(true)} className={`px-3 py-1.5 ${btnPrimary}`}>+ Nuevo trato</button>
          </div>

          {c.tratos.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin tratos. Crea el primero →</div>
          ) : (
            <div className="space-y-2.5">
              {c.tratos.map(t => {
                const et = EST_TRATO[t.estado] || { label: t.estado, icon: '📋', cls: 'border-gray-200 bg-gray-50' };
                const nexts = nextEstados(t.estado);
                return (
                  <div key={t.id} className={`border rounded-card p-4 ${et.cls}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{et.icon}</span>
                          <span className="font-semibold text-auro-navy text-sm">{t.titulo}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                          <span className="font-medium">{et.label}</span>
                          {t.importe && <span className="font-bold text-auro-orange">{fmt(t.importe)}</span>}
                          {t.tipo && <span>{TIPOS[t.tipo]} {t.tipo}</span>}
                          {t.potenciaEstimada && <span>⚡ {t.potenciaEstimada} kWp</span>}
                          <span>{fmtDate(t.createdAt)}</span>
                        </div>
                        {t.notas && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{t.notas}</p>}
                        {t.motivoPerdido && <p className="text-[11px] text-estado-red mt-1">Motivo: {t.motivoPerdido}</p>}
                        {t.obra && (
                          <Link href="/obras" className="text-[11px] text-estado-blue hover:underline mt-1 inline-block">
                            🏗️ Obra {t.obra.codigo} ({t.obra.estado})
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {nexts.map(ne => {
                          const neCfg = EST_TRATO[ne];
                          return (
                            <button key={ne} onClick={() => avanzarTrato(t.id, ne)}
                              className={`px-2.5 py-1 rounded-button text-[10px] font-semibold border transition-colors ${
                                ne === 'PERDIDO' ? 'border-red-300 text-estado-red hover:bg-red-50' :
                                ne === 'GANADO' ? 'border-green-300 text-estado-green hover:bg-green-50' :
                                'border-auro-border text-auro-navy hover:bg-auro-surface-2'
                              }`}>
                              {neCfg?.icon} {neCfg?.label}
                            </button>
                          );
                        })}
                        {t.estado === 'GANADO' && !t.obra && (
                          <button onClick={() => convertirTrato(t.id)}
                            className="px-2.5 py-1 rounded-button text-[10px] font-semibold border border-green-300 text-estado-green hover:bg-green-50">
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

          {showTrato && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowTrato(false)}>
              <div className="bg-white rounded-card p-5 w-full max-w-md shadow-xl border border-auro-border" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-auro-navy mb-4">Nuevo trato</h3>
                <div className="space-y-3">
                  <input placeholder="Título del trato *" value={fTrato.titulo} onChange={e => setFTrato({...fTrato, titulo: e.target.value})} className={inputCls} />
                  <select value={fTrato.tipo} onChange={e => setFTrato({...fTrato, tipo: e.target.value})} className={inputCls}>
                    <option value="">Tipo instalación</option>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="kWp estimados" type="number" step="0.1" value={fTrato.potenciaEstimada}
                      onChange={e => setFTrato({...fTrato, potenciaEstimada: e.target.value})} className={inputCls} />
                    <input placeholder="Importe €" type="number" step="0.01" value={fTrato.importe}
                      onChange={e => setFTrato({...fTrato, importe: e.target.value})} className={inputCls} />
                  </div>
                  <textarea placeholder="Notas..." rows={2} value={fTrato.notas} onChange={e => setFTrato({...fTrato, notas: e.target.value})}
                    className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm text-auro-navy resize-none focus:outline-none focus:ring-2 focus:ring-auro-orange/30" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowTrato(false)} className={`flex-1 h-10 ${btnSecondary}`}>Cancelar</button>
                  <button onClick={crearTrato} disabled={!fTrato.titulo} className={`flex-1 h-10 ${btnPrimary} disabled:opacity-40`}>Crear</button>
                </div>
              </div>
            </div>
          )}

          {showPerdido && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPerdido(null)}>
              <div className="bg-white rounded-card p-5 w-full max-w-sm shadow-xl border border-auro-border" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-auro-navy mb-3">❌ Marcar como perdido</h3>
                <textarea placeholder="Motivo (opcional)" rows={3} value={motivoPerdido} onChange={e => setMotivoPerdido(e.target.value)}
                  className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm text-auro-navy resize-none mb-4" />
                <div className="flex gap-2">
                  <button onClick={() => setShowPerdido(null)} className={`flex-1 h-10 ${btnSecondary}`}>Cancelar</button>
                  <button onClick={confirmarPerdido} className="flex-1 h-10 bg-estado-red hover:bg-red-700 text-white rounded-button text-sm font-semibold">Confirmar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: TAREAS */}
      {tab === 'tareas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-500">Tareas</h3>
            <button onClick={() => setShowTarea(true)} className={`px-3 py-1.5 ${btnPrimary}`}>+ Nueva tarea</button>
          </div>

          {c.tareasCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin tareas</div>
          ) : (
            <div className="space-y-1.5">
              {c.tareasCrm.map(t => {
                const done = t.estado === 'COMPLETADA';
                const p = PRIO[t.prioridad] || PRIO.MEDIA;
                const vencida = t.fechaVencimiento && !done && new Date(t.fechaVencimiento) < new Date();
                return (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-card border transition-colors ${
                    done ? 'border-auro-border/50 bg-gray-50 opacity-60' : vencida ? 'border-red-300 bg-red-50' : 'border-auro-border bg-white'
                  }`}>
                    <button onClick={() => !done && completarTarea(t.id)}
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        done ? 'bg-estado-green border-estado-green text-white' : 'border-gray-300 hover:border-estado-green'
                      }`}>
                      {done && <span className="text-[10px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-auro-navy'}`}>
                        {TIPO_TAREA_ICON[t.tipo]} {t.titulo}
                      </div>
                      <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className={p.cls}>{p.icon} {t.prioridad}</span>
                        {t.fechaVencimiento && <span className={vencida ? 'text-estado-red font-semibold' : ''}>{fmtDate(t.fechaVencimiento)}</span>}
                        <span>→ {t.asignado.nombre}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showTarea && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowTarea(false)}>
              <div className="bg-white rounded-card p-5 w-full max-w-md shadow-xl border border-auro-border" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-auro-navy mb-4">Nueva tarea</h3>
                <div className="space-y-3">
                  <select value={fTarea.tipo} onChange={e => setFTarea({...fTarea, tipo: e.target.value})} className={inputCls}>
                    {Object.entries(TIPO_TAREA_ICON).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                  </select>
                  <input placeholder="Título *" value={fTarea.titulo} onChange={e => setFTarea({...fTarea, titulo: e.target.value})} className={inputCls} />
                  <textarea placeholder="Descripción..." rows={2} value={fTarea.descripcion} onChange={e => setFTarea({...fTarea, descripcion: e.target.value})}
                    className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm text-auro-navy resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={fTarea.fechaVencimiento} onChange={e => setFTarea({...fTarea, fechaVencimiento: e.target.value})} className={inputCls} />
                    <select value={fTarea.prioridad} onChange={e => setFTarea({...fTarea, prioridad: e.target.value})} className={inputCls}>
                      <option value="URGENTE">🔴 Urgente</option><option value="ALTA">🟠 Alta</option><option value="MEDIA">🟡 Media</option><option value="BAJA">🟢 Baja</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowTarea(false)} className={`flex-1 h-10 ${btnSecondary}`}>Cancelar</button>
                  <button onClick={crearTarea} disabled={!fTarea.titulo} className={`flex-1 h-10 ${btnPrimary} disabled:opacity-40`}>Crear</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: NOTAS */}
      {tab === 'notas' && (
        <div>
          <div className="mb-4 flex gap-2">
            <textarea placeholder="Añadir nota..." rows={2} value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-auro-border rounded-input text-sm text-auro-navy resize-none focus:outline-none focus:ring-2 focus:ring-auro-orange/30" />
            <button onClick={guardarNota} disabled={!nuevaNota.trim()}
              className={`px-4 ${btnPrimary} disabled:opacity-40 self-end h-10`}>Guardar</button>
          </div>

          {c.notasCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin notas</div>
          ) : (
            <div className="space-y-2">
              {c.notasCrm.map(n => (
                <div key={n.id} className={`p-3 rounded-card border ${n.fijada ? 'border-yellow-300 bg-yellow-50' : 'border-auro-border bg-white'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-auro-navy whitespace-pre-wrap flex-1">{n.contenido}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => fijarNota(n.id, !n.fijada)} className="text-xs hover:opacity-70">{n.fijada ? '📌' : '📍'}</button>
                      <button onClick={() => eliminarNota(n.id)} className="text-xs text-estado-red hover:opacity-70">🗑️</button>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1.5">{n.autor.nombre} {n.autor.apellidos} · {fmtTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ARCHIVOS */}
      {tab === 'archivos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-500">Archivos adjuntos</h3>
            <span className="text-[10px] text-gray-400">Subida próximamente</span>
          </div>
          {c.archivosCrm.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin archivos</div>
          ) : (
            <div className="space-y-1.5">
              {c.archivosCrm.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-card border border-auro-border bg-white">
                  <span className="text-xl">📎</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-auro-navy truncate">{a.nombre}</div>
                    <div className="text-[10px] text-gray-400">{a.subidoPor.nombre} · {fmtDate(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: INFO */}
      {tab === 'info' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-500">Datos del contacto</h3>
            {!editInfo ? (
              <button onClick={() => { setEditInfo(true); setFEdit({
                nombre: c.nombre, apellidos: c.apellidos, empresa: c.empresa || '',
                telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '',
                localidad: c.localidad || '', provincia: c.provincia || '', codigoPostal: c.codigoPostal || '',
              }); }} className={`px-3 py-1.5 ${btnSecondary}`}>✏️ Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditInfo(false)} className={`px-3 py-1.5 ${btnSecondary}`}>Cancelar</button>
                <button onClick={guardarEdicion} className={`px-3 py-1.5 ${btnPrimary}`}>Guardar</button>
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
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">{f.label}</label>
                  <input value={fEdit[f.k] || ''} onChange={e => setFEdit({...fEdit, [f.k]: e.target.value})} className={`${inputCls} mt-0.5`} />
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
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{f.label}</div>
                  <div className="text-sm text-auro-navy">{f.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
