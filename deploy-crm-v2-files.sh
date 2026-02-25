#!/bin/bash
# Deploy CRM V2 files - ejecutar desde /var/www/erp con sudo
set -e
echo "🚀 Creando archivos CRM V2..."

# Ensure directories
mkdir -p src/app/\(dashboard\)/contactos/\[id\]
mkdir -p src/app/\(dashboard\)/crm
mkdir -p src/app/api/crm-v2/pipeline
mkdir -p src/app/api/crm-v2/dashboard
mkdir -p src/app/api/contactos/\[id\]/convertir
mkdir -p src/app/api/contactos/\[id\]/notas
mkdir -p src/app/api/notas-crm/\[id\]
mkdir -p src/app/api/tratos/\[id\]/convertir
mkdir -p src/lib


echo '  → src/app/\(dashboard\)/contactos/page.tsx'
cat > 'src/app/\(dashboard\)/contactos/page.tsx' << 'FILEEOF'
// src/app/(dashboard)/contactos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Contacto {
  id: string;
  nombre: string;
  apellidos: string;
  empresa: string | null;
  telefono: string | null;
  email: string | null;
  localidad: string | null;
  estado: string;
  createdAt: string;
  comercial: { id: string; nombre: string; apellidos: string } | null;
  tratos: Array<{ id: string; estado: string; importe: number | null }>;
  _count: { tareasCrm: number; notasCrm: number };
}

const ESTADOS_CONTACTO: Record<string, { label: string; color: string; bg: string }> = {
  POSIBLE_CLIENTE: { label: 'Posible cliente', color: 'text-estado-blue', bg: 'bg-estado-blue/10' },
  CUALIFICADO: { label: 'Cualificado', color: 'text-estado-purple', bg: 'bg-estado-purple/10' },
  CLIENTE: { label: 'Cliente', color: 'text-estado-green', bg: 'bg-estado-green/10' },
  PERDIDO: { label: 'Perdido', color: 'text-estado-red', bg: 'bg-estado-red/10' },
  INACTIVO: { label: 'Inactivo', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nombre: '', apellidos: '', empresa: '', telefono: '', email: '',
    direccion: '', localidad: '', provincia: '', codigoPostal: '', origen: 'TELEFONO',
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (busqueda) params.set('q', busqueda);

    try {
      const res = await fetch(`/api/contactos?${params}`);
      const data = await res.json();
      setContactos(data.data || []);
    } catch { /* */ }
    setLoading(false);
  }, [filtroEstado, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const crearContacto = async () => {
    if (!form.nombre.trim()) return;
    try {
      await fetch('/api/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setMostrarNuevo(false);
      setForm({ nombre: '', apellidos: '', empresa: '', telefono: '', email: '', direccion: '', localidad: '', provincia: '', codigoPostal: '', origen: 'TELEFONO' });
      cargar();
    } catch { /* */ }
  };

  const valorTotalTratos = (tratos: Contacto['tratos']) =>
    tratos.filter(t => t.estado !== 'PERDIDO').reduce((s, t) => s + (t.importe || 0), 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-auro-navy">Contactos</h1>
          <p className="text-sm text-gray-500 mt-1">CRM · Gestión de posibles clientes y oportunidades</p>
        </div>
        <button
          onClick={() => setMostrarNuevo(true)}
          className="px-4 py-2.5 bg-auro-orange text-white rounded-xl font-bold text-sm shadow-lg shadow-auro-orange/30 hover:shadow-auro-orange/50 transition-all"
        >
          + Nuevo contacto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar nombre, empresa, teléfono…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-auro-orange/30 focus:border-auro-orange outline-none"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_CONTACTO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(ESTADOS_CONTACTO).map(([estado, cfg]) => {
          const count = contactos.filter(c => c.estado === estado).length;
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? '' : estado)}
              className={`p-3 rounded-xl border text-center transition-all ${
                filtroEstado === estado ? 'border-auro-orange bg-auro-orange/5' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="text-xl font-extrabold text-auro-navy">{count}</div>
              <div className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : contactos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <div className="font-semibold">No hay contactos</div>
          <div className="text-sm">Crea el primero para empezar</div>
        </div>
      ) : (
        <div className="space-y-2">
          {contactos.map((c) => {
            const est = ESTADOS_CONTACTO[c.estado] || ESTADOS_CONTACTO.POSIBLE_CLIENTE;
            const valor = valorTotalTratos(c.tratos);
            return (
              <Link
                key={c.id}
                href={`/contactos/${c.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-auro-orange/30 hover:shadow-md transition-all group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-auro-orange/10 text-auro-orange flex items-center justify-center text-sm font-bold shrink-0">
                  {c.nombre[0]}{(c.apellidos || '')[0] || ''}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-auro-navy text-sm group-hover:text-auro-orange transition-colors truncate">
                      {c.nombre} {c.apellidos}
                    </span>
                    {c.empresa && (
                      <span className="text-xs text-gray-400 truncate hidden sm:inline">
                        · {c.empresa}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    {c.telefono && <span>📱 {c.telefono}</span>}
                    {c.localidad && <span className="hidden sm:inline">📍 {c.localidad}</span>}
                  </div>
                </div>

                {/* Tratos */}
                <div className="text-right hidden md:block">
                  {c.tratos.length > 0 ? (
                    <>
                      <div className="text-sm font-bold text-auro-navy">
                        {(valor / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </div>
                      <div className="text-[11px] text-gray-400">{c.tratos.length} trato{c.tratos.length > 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-gray-300">Sin tratos</div>
                  )}
                </div>

                {/* Tareas + notas */}
                <div className="flex items-center gap-2 text-xs text-gray-400 hidden lg:flex">
                  {c._count.tareasCrm > 0 && <span>✅ {c._count.tareasCrm}</span>}
                  {c._count.notasCrm > 0 && <span>📝 {c._count.notasCrm}</span>}
                </div>

                {/* Estado badge */}
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${est.bg} ${est.color} shrink-0`}>
                  {est.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal nuevo contacto */}
      {mostrarNuevo && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={() => setMostrarNuevo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-extrabold text-auro-navy">Nuevo contacto</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre *</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Apellidos</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Empresa</label>
                <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Teléfono</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Dirección</label>
                <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Localidad</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Provincia</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">C.P.</label>
                  <input className="w-full px-3 py-2 border rounded-xl text-sm" value={form.codigoPostal} onChange={(e) => setForm({ ...form, codigoPostal: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Origen</label>
                <select className="w-full px-3 py-2 border rounded-xl text-sm" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}>
                  {['WEB', 'RECOMENDACION', 'FERIA', 'PUERTA_FRIA', 'REPETIDOR', 'TELEFONO', 'OTRO'].map((o) => (
                    <option key={o} value={o}>{o.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarNuevo(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={crearContacto} className="px-5 py-2 bg-auro-orange text-white rounded-xl text-sm font-bold shadow-lg shadow-auro-orange/30">
                Crear contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

FILEEOF

echo '  → src/app/\(dashboard\)/contactos/\[id\]/page.tsx'
cat > 'src/app/\(dashboard\)/contactos/\[id\]/page.tsx' << 'FILEEOF'
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

FILEEOF

echo '  → src/app/\(dashboard\)/crm/page.tsx'
cat > 'src/app/\(dashboard\)/crm/page.tsx' << 'FILEEOF'
// src/app/(dashboard)/crm/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PipelineCol {
  estado: string; orden: number; conteo: number; valor: number;
}

interface Trato {
  id: string; titulo: string; estado: string; importe: number | null;
  tipo: string | null; createdAt: string;
  contacto: { id: string; nombre: string; apellidos: string; comercialId: string | null;
    comercial: { id: string; nombre: string; apellidos: string } | null };
  obra: { id: string; codigo: string; estado: string } | null;
}

interface DashData {
  tipo: string;
  data: any;
}

const COLS_CONFIG: Record<string, { label: string; icon: string; color: string; border: string }> = {
  NUEVO_CONTACTO: { label: 'Nuevo', icon: '🆕', color: 'bg-blue-500/10', border: 'border-t-blue-500' },
  VISITA_AGENDADA: { label: 'Visita', icon: '📅', color: 'bg-indigo-500/10', border: 'border-t-indigo-500' },
  A_LA_ESPERA_PRESUPUESTO: { label: 'Espera ppto', icon: '⏳', color: 'bg-yellow-500/10', border: 'border-t-yellow-500' },
  PRESUPUESTO_ENVIADO: { label: 'Ppto enviado', icon: '📄', color: 'bg-orange-500/10', border: 'border-t-orange-500' },
  NEGOCIACION: { label: 'Negociación', icon: '🤝', color: 'bg-purple-500/10', border: 'border-t-purple-500' },
  GANADO: { label: 'Ganado', icon: '✅', color: 'bg-green-500/10', border: 'border-t-green-500' },
  PERDIDO: { label: 'Perdido', icon: '❌', color: 'bg-red-500/10', border: 'border-t-red-500' },
};

const VISIBLE_COLS = ['NUEVO_CONTACTO', 'VISITA_AGENDADA', 'A_LA_ESPERA_PRESUPUESTO', 'PRESUPUESTO_ENVIADO', 'NEGOCIACION'];
const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€`;

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [tratos, setTratos] = useState<Trato[]>([]);
  const [dash, setDash] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroComercial, setFiltroComercial] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const params = filtroComercial ? `?comercialId=${filtroComercial}` : '';
    const [rPipe, rTratos, rDash] = await Promise.all([
      fetch(`/api/crm-v2/pipeline${params}`).then(r => r.json()),
      fetch(`/api/tratos${params}`).then(r => r.json()),
      fetch('/api/crm-v2/dashboard').then(r => r.json()),
    ]);
    if (rPipe.ok) setPipeline(rPipe.data);
    if (rTratos.ok) setTratos(rTratos.data);
    if (rDash.ok) setDash(rDash.data);
    setLoading(false);
  }

  const tratosActivos = tratos.filter(t => !['GANADO', 'PERDIDO'].includes(t.estado));
  const totalPipelineValor = pipeline.filter(p => !['GANADO', 'PERDIDO'].includes(p.estado)).reduce((s, p) => s + p.valor, 0);
  const totalPipelineConteo = pipeline.filter(p => !['GANADO', 'PERDIDO'].includes(p.estado)).reduce((s, p) => s + p.conteo, 0);
  const ganados = pipeline.find(p => p.estado === 'GANADO');
  const perdidos = pipeline.find(p => p.estado === 'PERDIDO');

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando CRM...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline activo</div>
          <div className="text-2xl font-bold text-white mt-1">{totalPipelineConteo}</div>
          <div className="text-xs text-orange-400 font-semibold">{fmt(totalPipelineValor)}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Ganados</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{ganados?.conteo || 0}</div>
          <div className="text-xs text-green-400/70">{fmt(ganados?.valor || 0)}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Perdidos</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{perdidos?.conteo || 0}</div>
          <div className="text-xs text-red-400/70">{fmt(perdidos?.valor || 0)}</div>
        </div>
        {dash?.tipo === 'direccion' && dash.data?.kpis && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tasa conversión</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{dash.data.kpis.tasaConversion}%</div>
            <div className="text-xs text-gray-500">ganados / cerrados</div>
          </div>
        )}
        {dash?.tipo === 'comercial' && dash.data && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Mis tareas hoy</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{dash.data.tareasHoy || 0}</div>
            <div className="text-xs text-gray-500">{dash.data.tareasPendientes || 0} pendientes</div>
          </div>
        )}
      </div>

      {/* Pipeline Kanban */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Pipeline de tratos</h2>
          <Link href="/contactos" className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold">
            + Nuevo contacto
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {VISIBLE_COLS.map(est => {
            const cfg = COLS_CONFIG[est];
            const col = pipeline.find(p => p.estado === est);
            const tratosCol = tratosActivos.filter(t => t.estado === est);
            return (
              <div key={est} className={`rounded-xl border-t-3 ${cfg.border} border border-gray-700/50 ${cfg.color} min-h-[200px]`}>
                {/* Column header */}
                <div className="px-3 py-2 border-b border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300">{cfg.icon} {cfg.label}</span>
                    <span className="text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded-full text-gray-400">{col?.conteo || 0}</span>
                  </div>
                  {(col?.valor || 0) > 0 && <div className="text-[10px] text-orange-400 font-semibold mt-0.5">{fmt(col!.valor)}</div>}
                </div>
                {/* Cards */}
                <div className="p-1.5 space-y-1.5">
                  {tratosCol.map(t => (
                    <Link key={t.id} href={`/contactos/${t.contacto.id}`}
                      className="block p-2.5 bg-gray-800/80 rounded-lg border border-gray-700/50 hover:border-orange-500/30 transition-colors cursor-pointer">
                      <div className="text-xs font-semibold text-white truncate">{t.titulo}</div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {t.contacto.nombre} {t.contacto.apellidos}
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        {t.importe ? <span className="text-[10px] font-bold text-orange-400">{fmt(t.importe)}</span> : <span />}
                        {t.contacto.comercial && (
                          <span className="text-[9px] text-gray-500">{t.contacto.comercial.nombre}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {tratosCol.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-gray-600">Vacío</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking comerciales (solo dirección) */}
      {dash?.tipo === 'direccion' && dash.data?.ranking && dash.data.ranking.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">🏆 Ranking comerciales (mes actual)</h3>
          <div className="space-y-1.5">
            {dash.data.ranking.map((r: any, i: number) => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                <span className="text-lg w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{r.nombre}</div>
                  <div className="text-[10px] text-gray-500">{r.zona || 'Sin zona'} · {r.totalContactos} contactos · {r.tratosAbiertos} tratos abiertos</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-green-400">{fmt(r.valorGanadoMes)}</div>
                  <div className="text-[10px] text-gray-500">{r.tratosGanadosMes} ganados · {r.cumplimiento}% obj.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

FILEEOF

echo '  → src/components/layout/Sidebar.tsx'
cat > 'src/components/layout/Sidebar.tsx' << 'FILEEOF'
// src/components/layout/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Rol } from '@prisma/client';

interface Props {
  usuario: {
    nombre: string;
    apellidos: string;
    rol: Rol;
  };
}

interface NavItem {
  href: string;
  icon: string;
  text: string;
  roles: string[];
}

interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    label: 'Comercial',
    icon: '💼',
    items: [
      { href: '/crm', icon: '📊', text: 'Pipeline', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/contactos', icon: '👤', text: 'Contactos', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/tareas-crm', icon: '✅', text: 'Mis Tareas', roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
      { href: '/comerciales', icon: '🏆', text: 'Ranking', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/comisiones', icon: '💶', text: 'Comisiones', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Operaciones',
    icon: '🏗️',
    items: [
      { href: '/obras', icon: '🏗️', text: 'Obras', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'COMERCIAL', 'ADMINISTRACION'] },
      { href: '/planificacion', icon: '📅', text: 'Planificación', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/materiales', icon: '📦', text: 'Material', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
      { href: '/legalizacion', icon: '📋', text: 'Legalización', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/incidencias', icon: '⚠️', text: 'Incidencias', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/activos', icon: '🔋', text: 'Activos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
      { href: '/subvenciones', icon: '🏛️', text: 'Subvenciones', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Financiero',
    icon: '💰',
    items: [
      { href: '/cobros', icon: '💰', text: 'Cobros', roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
      { href: '/rentabilidad', icon: '📈', text: 'Rentabilidad', roles: ['ADMIN', 'DIRECCION'] },
    ],
  },
  {
    label: 'Clientes',
    icon: '👥',
    items: [
      { href: '/clientes', icon: '👥', text: 'Clientes', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION', 'COMERCIAL'] },
      { href: '/documentos', icon: '📁', text: 'Documentos', roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
    ],
  },
  {
    label: 'Campo',
    icon: '🔧',
    items: [
      { href: '/campo', icon: '📍', text: 'Check-in/out', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/gastos', icon: '🧾', text: 'Gastos', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
      { href: '/campo/validar-avanzado', icon: '✅', text: 'Validación', roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
    ],
  },
  {
    label: 'Admin',
    icon: '⚙️',
    items: [
      { href: '/dashboard', icon: '📊', text: 'Dashboard', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/usuarios', icon: '👥', text: 'Usuarios', roles: ['ADMIN'] },
      { href: '/auditoria', icon: '📜', text: 'Auditoría', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/exportar', icon: '📥', text: 'Exportar / GDPR', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/configuracion', icon: '⚙️', text: 'Configuración', roles: ['ADMIN', 'DIRECCION'] },
      { href: '/branding', icon: '🎨', text: 'Branding', roles: ['ADMIN'] },
    ],
  },
];

export function Sidebar({ usuario }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const iniciales = `${usuario.nombre[0]}${(usuario.apellidos || '')[0] || ''}`.toUpperCase();

  const rolLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRECCION: 'Dirección',
    COMERCIAL: 'Comercial',
    JEFE_INSTALACIONES: 'Jefe Instalaciones',
    INSTALADOR: 'Instalador',
    ADMINISTRACION: 'Administración',
  };

  // Auto-expand section with active page, collapse others
  useEffect(() => {
    const newCollapsed: Record<string, boolean> = {};
    NAV_ITEMS.forEach((group) => {
      const isActive = group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      newCollapsed[group.label] = !isActive;
    });
    setCollapsed(newCollapsed);
  }, []);

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-auro-navy text-white rounded-xl flex items-center justify-center text-lg shadow-lg"
      >
        ☰
      </button>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/45 z-[99]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[250px] bg-auro-navy z-[100] flex flex-col transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-auro-orange flex items-center justify-center text-lg shadow-md shadow-auro-orange/30">
              ☀️
            </div>
            <div>
              <div className="text-white text-[15px] font-extrabold leading-tight">
                Auro <span className="text-auro-orange">Solar</span>
              </div>
              <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider">
                Energía · ERP
              </div>
            </div>
          </div>
        </div>

        {/* Info usuario */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-auro-orange/20 text-auro-orange flex items-center justify-center text-[11px] font-bold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-[13px] font-bold truncate">
              {usuario.nombre} {usuario.apellidos}
            </div>
            <div className="text-white/40 text-[10px] font-medium">
              {rolLabel[usuario.rol] || usuario.rol}
            </div>
          </div>
        </div>

        {/* Navegación colapsable */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_ITEMS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(usuario.rol)
            );
            if (visibleItems.length === 0) return null;

            const isCollapsed = collapsed[group.label] ?? false;
            const hasActive = visibleItems.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + '/')
            );

            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleSection(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-[0.08em] transition-colors
                    ${hasActive ? 'text-auro-orange/80' : 'text-white/30 hover:text-white/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{group.icon}</span>
                    {group.label}
                  </div>
                  <span className={`text-[8px] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                    ▶
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-200 ease-out ${
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                  }`}
                >
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-[7px] ml-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150 mb-[1px]
                          ${isActive
                            ? 'bg-white/[0.1] text-white'
                            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
                          }`}
                      >
                        <span className="text-sm w-5 text-center">{item.icon}</span>
                        {item.text}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-estado-green animate-pulse" />
          <span className="text-white/25 text-[10px] font-medium">
            v2.0 · ERP Auro Solar
          </span>
        </div>
      </aside>
    </>
  );
}

FILEEOF

echo '  → src/app/api/crm-v2/pipeline/route.ts'
cat > 'src/app/api/crm-v2/pipeline/route.ts' << 'FILEEOF'
import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const comercialId = searchParams.get('comercialId') || undefined;
  const data = await crm.obtenerPipeline(comercialId);
  return apiOk(data);
});

FILEEOF

echo '  → src/app/api/crm-v2/dashboard/route.ts'
cat > 'src/app/api/crm-v2/dashboard/route.ts' << 'FILEEOF'
import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  if (usuario.rol === 'COMERCIAL') {
    const data = await crm.dashboardComercial(usuario.id);
    return apiOk({ tipo: 'comercial', data });
  }
  const [kpis, ranking] = await Promise.all([
    crm.kpisGeneralesCRM(),
    crm.rankingComerciales(),
  ]);
  return apiOk({ tipo: 'direccion', data: { kpis, ranking } });
});

FILEEOF

echo '  → src/app/api/contactos/route.ts'
cat > 'src/app/api/contactos/route.ts' << 'FILEEOF'
// src/app/api/contactos/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const filtros: any = {};
  if (searchParams.get('estado')) filtros.estado = searchParams.get('estado');
  if (searchParams.get('comercialId')) filtros.comercialId = searchParams.get('comercialId');
  if (searchParams.get('q')) filtros.q = searchParams.get('q');
  if (usuario.rol === 'COMERCIAL' && searchParams.get('soloMios') === 'true') {
    filtros.comercialId = usuario.id;
  }
  const data = await crm.listarContactos(filtros);
  return apiOk(data);
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const body = await req.json();
  if (!body.nombre) return apiError('Nombre requerido', 400);
  if (usuario.rol === 'COMERCIAL' && !body.comercialId) body.comercialId = usuario.id;
  const contacto = await crm.crearContacto(body, usuario.id);
  return apiOk(contacto, 201);
});

FILEEOF

echo '  → src/app/api/contactos/\[id\]/route.ts'
cat > 'src/app/api/contactos/\[id\]/route.ts' << 'FILEEOF'
// src/app/api/contactos/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const data = await crm.obtenerContacto(id);
  if (!data) return apiError('No encontrado', 404);
  return apiOk(data);
});

export const PATCH = withAuth('crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const body = await req.json();
  const data = await crm.actualizarContacto(id, body, usuario.id);
  return apiOk(data);
});

FILEEOF

echo '  → src/app/api/contactos/\[id\]/convertir/route.ts'
cat > 'src/app/api/contactos/\[id\]/convertir/route.ts' << 'FILEEOF'
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts[parts.length - 2]; // /api/contactos/[id]/convertir
  try {
    const cliente = await crm.convertirACliente(id, usuario.id);
    return apiOk(cliente);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});

FILEEOF

echo '  → src/app/api/contactos/\[id\]/notas/route.ts'
cat > 'src/app/api/contactos/\[id\]/notas/route.ts' << 'FILEEOF'
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts[parts.length - 2]; // /api/contactos/[id]/notas
  const { contenido } = await req.json();
  if (!contenido) return apiError('Contenido requerido', 400);
  const nota = await crm.crearNota(id, contenido, usuario.id);
  return apiOk(nota, 201);
});

FILEEOF

echo '  → src/app/api/notas-crm/\[id\]/route.ts'
cat > 'src/app/api/notas-crm/\[id\]/route.ts' << 'FILEEOF'
import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const PATCH = withAuth('crm:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { fijada } = await req.json();
  const nota = await crm.fijarNota(id, fijada);
  return apiOk(nota);
});

export const DELETE = withAuth('crm:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  await crm.eliminarNota(id);
  return apiOk({ deleted: true });
});

FILEEOF

echo '  → src/app/api/tratos/route.ts'
cat > 'src/app/api/tratos/route.ts' << 'FILEEOF'
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const filtros: any = {};
  if (searchParams.get('contactoId')) filtros.contactoId = searchParams.get('contactoId');
  if (searchParams.get('estado')) filtros.estado = searchParams.get('estado');
  if (searchParams.get('comercialId')) filtros.comercialId = searchParams.get('comercialId');
  const data = await crm.listarTratos(filtros);
  return apiOk(data);
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const body = await req.json();
  if (!body.contactoId || !body.titulo) return apiError('contactoId y titulo requeridos', 400);
  const trato = await crm.crearTrato(body, usuario.id);
  return apiOk(trato, 201);
});

FILEEOF

echo '  → src/app/api/tratos/\[id\]/route.ts'
cat > 'src/app/api/tratos/\[id\]/route.ts' << 'FILEEOF'
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const PATCH = withAuth('crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { estado, motivoPerdido } = await req.json();
  if (!estado) return apiError('estado requerido', 400);
  try {
    const trato = await crm.avanzarTrato(id, estado, usuario.id, { motivoPerdido });
    return apiOk(trato);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});

FILEEOF

echo '  → src/app/api/tratos/\[id\]/convertir/route.ts'
cat > 'src/app/api/tratos/\[id\]/convertir/route.ts' << 'FILEEOF'
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts[parts.length - 2];
  try {
    const obra = await crm.convertirTratoAObra(id, usuario.id);
    return apiOk(obra);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});

FILEEOF

echo '  → src/app/api/tareas-crm/route.ts'
cat > 'src/app/api/tareas-crm/route.ts' << 'FILEEOF'
// src/app/api/tareas-crm/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const GET = withAuth('tareas-crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const userId = usuario.rol === 'COMERCIAL' ? usuario.id : (searchParams.get('asignadoId') || usuario.id);
  const filtros = {
    estado: searchParams.get('estado') || undefined,
    tipo: searchParams.get('tipo') || undefined,
  };
  const tareas = await crmV2.listarTareas({ asignadoId: userId, estado: filtros.estado });
  return apiOk(tareas);
});

const crearSchema = z.object({
  contactoId: z.string().uuid().optional(),
  tipo: z.enum(['LLAMADA', 'EMAIL', 'REUNION', 'VISITA', 'PRESUPUESTO', 'SEGUIMIENTO', 'OTRO']),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  asignadoId: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
});

export const POST = withAuth('tareas-crm:crear', async (req, { usuario }) => {
  const data = await parseBody(req, crearSchema);
  const tarea = await crmV2.crearTarea(
    {
      ...data,
      asignadoId: data.asignadoId && data.asignadoId !== 'self' ? data.asignadoId : usuario.id,
    },
    usuario.id
  );
  return apiOk(tarea);
});

FILEEOF

echo '  → src/app/api/tareas-crm/\[id\]/route.ts'
cat > 'src/app/api/tareas-crm/\[id\]/route.ts' << 'FILEEOF'
// src/app/api/tareas-crm/[id]/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const PATCH = withAuth('tareas-crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const body = await req.json();
  if (body.estado === 'COMPLETADA') {
    const tarea = await crmV2.completarTarea(id, usuario.id);
    return apiOk(tarea);
  }
  const tarea = await crmV2.actualizarTarea(id, body);
  return apiOk(tarea);
});

FILEEOF

echo '  → src/app/api/config-sistema/route.ts'
cat > 'src/app/api/config-sistema/route.ts' << 'FILEEOF'
// src/app/api/config-sistema/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const GET = withAuth('config:ver', async () => {
  const config = await crmV2.obtenerConfigSistema();
  return apiOk(config);
});

const updateSchema = z.object({
  nombreEmpresa: z.string().optional(),
  logoUrl: z.string().optional(),
  colorPrimario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorSecundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const PATCH = withAuth('config:editar', async (req, { usuario }) => {
  const data = await parseBody(req, updateSchema);
  const config = await crmV2.actualizarConfigSistema(data, usuario.id);
  return apiOk(config);
});

FILEEOF

echo '  → src/services/crm-v2.service.ts'
cat > 'src/services/crm-v2.service.ts' << 'FILEEOF'
// src/services/crm-v2.service.ts
import { prisma } from '@/lib/prisma';
import { EstadoContacto, EstadoTrato } from '@prisma/client';

// ═══ CONTACTOS ═══

export async function listarContactos(filtros: { estado?: string; comercialId?: string; q?: string }) {
  const where: any = { deletedAt: null };
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.comercialId) where.comercialId = filtros.comercialId;
  if (filtros.q) {
    where.OR = [
      { nombre: { contains: filtros.q, mode: 'insensitive' } },
      { apellidos: { contains: filtros.q, mode: 'insensitive' } },
      { empresa: { contains: filtros.q, mode: 'insensitive' } },
      { telefono: { contains: filtros.q, mode: 'insensitive' } },
      { email: { contains: filtros.q, mode: 'insensitive' } },
    ];
  }
  return prisma.contacto.findMany({
    where,
    include: {
      comercial: { select: { id: true, nombre: true, apellidos: true } },
      tratos: { select: { id: true, estado: true, importe: true, titulo: true } },
      _count: { select: { tareasCrm: true, notasCrm: true, archivosCrm: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function obtenerContacto(id: string) {
  return prisma.contacto.findUnique({
    where: { id },
    include: {
      comercial: { select: { id: true, nombre: true, apellidos: true, email: true } },
      cliente: { select: { id: true, nombre: true, apellidos: true } },
      tratos: { orderBy: { createdAt: 'desc' }, include: { obra: { select: { id: true, codigo: true, estado: true } } } },
      tareasCrm: { orderBy: { fechaVencimiento: 'asc' }, include: { asignado: { select: { id: true, nombre: true, apellidos: true } } } },
      notasCrm: { orderBy: [{ fijada: 'desc' }, { createdAt: 'desc' }], include: { autor: { select: { id: true, nombre: true, apellidos: true } } } },
      archivosCrm: { orderBy: { createdAt: 'desc' }, include: { subidoPor: { select: { id: true, nombre: true } } } },
    },
  });
}

export async function crearContacto(datos: {
  nombre: string; apellidos?: string; empresa?: string; telefono?: string; email?: string;
  direccion?: string; localidad?: string; provincia?: string; codigoPostal?: string;
  origen?: string; tipoInteres?: string; comercialId?: string;
}, usuarioId: string) {
  const contacto = await prisma.contacto.create({
    data: {
      nombre: datos.nombre, apellidos: datos.apellidos || '',
      empresa: datos.empresa || null, telefono: datos.telefono || null, email: datos.email || null,
      direccion: datos.direccion || null, localidad: datos.localidad || null,
      provincia: datos.provincia || null, codigoPostal: datos.codigoPostal || null,
      origen: datos.origen as any || null, tipoInteres: datos.tipoInteres as any || null,
      comercialId: datos.comercialId || null,
    },
  });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_CREADO', entidad: 'contacto', entidadId: contacto.id, detalle: JSON.stringify({ nombre: contacto.nombre }) } });
  return contacto;
}

export async function actualizarContacto(id: string, datos: Record<string, any>, usuarioId: string) {
  const contacto = await prisma.contacto.update({ where: { id }, data: datos });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_ACTUALIZADO', entidad: 'contacto', entidadId: id, detalle: JSON.stringify(datos) } });
  return contacto;
}

export async function convertirACliente(contactoId: string, usuarioId: string) {
  const c = await prisma.contacto.findUnique({ where: { id: contactoId } });
  if (!c) throw new Error('Contacto no encontrado');
  if (c.clienteId) throw new Error('Ya convertido');
  const cliente = await prisma.cliente.create({
    data: { nombre: c.nombre, apellidos: c.apellidos, telefono: c.telefono, email: c.email, direccion: c.direccion, localidad: c.localidad, provincia: c.provincia, codigoPostal: c.codigoPostal },
  });
  await prisma.contacto.update({ where: { id: contactoId }, data: { clienteId: cliente.id, estado: 'CLIENTE' } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_CONVERTIDO_CLIENTE', entidad: 'contacto', entidadId: contactoId, detalle: JSON.stringify({ clienteId: cliente.id }) } });
  return cliente;
}

// ═══ TRATOS ═══

const ESTADOS_TRATO_ORDEN: Record<string, number> = {
  NUEVO_CONTACTO: 0, VISITA_AGENDADA: 1, A_LA_ESPERA_PRESUPUESTO: 2,
  PRESUPUESTO_ENVIADO: 3, NEGOCIACION: 4, GANADO: 5, PERDIDO: 6,
};

export async function listarTratos(filtros: { contactoId?: string; estado?: string; comercialId?: string }) {
  const where: any = {};
  if (filtros.contactoId) where.contactoId = filtros.contactoId;
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.comercialId) where.contacto = { comercialId: filtros.comercialId };
  return prisma.trato.findMany({
    where,
    include: {
      contacto: { select: { id: true, nombre: true, apellidos: true, comercialId: true, comercial: { select: { id: true, nombre: true, apellidos: true } } } },
      obra: { select: { id: true, codigo: true, estado: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function obtenerPipeline(comercialId?: string) {
  const where: any = {};
  if (comercialId) where.contacto = { comercialId };
  const tratos = await prisma.trato.findMany({ where, select: { estado: true, importe: true } });
  return Object.keys(ESTADOS_TRATO_ORDEN).map(estado => ({
    estado, orden: ESTADOS_TRATO_ORDEN[estado],
    conteo: tratos.filter(t => t.estado === estado).length,
    valor: tratos.filter(t => t.estado === estado).reduce((s, t) => s + (t.importe || 0), 0),
  }));
}

export async function crearTrato(datos: { contactoId: string; titulo: string; tipo?: string; potenciaEstimada?: number; importe?: number; notas?: string }, usuarioId: string) {
  const contacto = await prisma.contacto.findUnique({ where: { id: datos.contactoId } });
  if (!contacto) throw new Error('Contacto no encontrado');
  const trato = await prisma.trato.create({
    data: { contactoId: datos.contactoId, titulo: datos.titulo, tipo: datos.tipo as any || null, potenciaEstimada: datos.potenciaEstimada || null, importe: datos.importe || null, estado: 'NUEVO_CONTACTO', notas: datos.notas || null },
  });
  if (contacto.estado === 'POSIBLE_CLIENTE') await prisma.contacto.update({ where: { id: datos.contactoId }, data: { estado: 'CUALIFICADO' } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TRATO_CREADO', entidad: 'trato', entidadId: trato.id, detalle: JSON.stringify({ titulo: trato.titulo }) } });
  return trato;
}

export async function avanzarTrato(tratoId: string, nuevoEstado: EstadoTrato, usuarioId: string, extras?: { motivoPerdido?: string }) {
  const anterior = await prisma.trato.findUnique({ where: { id: tratoId } });
  if (!anterior) throw new Error('Trato no encontrado');
  const data: any = { estado: nuevoEstado };
  if (nuevoEstado === 'PERDIDO' && extras?.motivoPerdido) data.motivoPerdido = extras.motivoPerdido;
  if (nuevoEstado === 'GANADO') data.fechaCierre = new Date();
  const trato = await prisma.trato.update({ where: { id: tratoId }, data });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TRATO_ESTADO_CAMBIADO', entidad: 'trato', entidadId: tratoId, detalle: JSON.stringify({ antes: anterior.estado, despues: nuevoEstado }) } });
  return trato;
}

export async function convertirTratoAObra(tratoId: string, usuarioId: string) {
  const trato = await prisma.trato.findUnique({ where: { id: tratoId }, include: { contacto: true } });
  if (!trato) throw new Error('Trato no encontrado');
  if (trato.estado !== 'GANADO') throw new Error('Solo tratos GANADOS');
  if (trato.obraId) throw new Error('Ya tiene obra');

  let clienteId = trato.contacto.clienteId;
  if (!clienteId) { const cl = await convertirACliente(trato.contactoId, usuarioId); clienteId = cl.id; }

  const ahora = new Date();
  const prefix = `A-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.obra.count({ where: { codigo: { startsWith: prefix } } });
  const codigo = `${prefix}-${String(count + 1).padStart(3, '0')}`;

  const obra = await prisma.obra.create({
    data: { codigo, clienteId: clienteId!, tipo: trato.tipo || 'RESIDENCIAL', estado: 'REVISION_TECNICA', potenciaKwp: trato.potenciaEstimada || null, presupuestoTotal: trato.importe || 0, comercialId: trato.contacto.comercialId || null, notas: trato.notas || null },
  });
  await prisma.trato.update({ where: { id: tratoId }, data: { obraId: obra.id } });
  await prisma.actividad.create({ data: { usuarioId, obraId: obra.id, accion: 'OBRA_CREADA_DESDE_TRATO', entidad: 'obra', entidadId: obra.id, detalle: JSON.stringify({ tratoId, codigo }) } });
  return obra;
}

// ═══ TAREAS CRM ═══

export async function listarTareas(filtros: { asignadoId?: string; contactoId?: string; estado?: string; soloHoy?: boolean; soloPendientes?: boolean }) {
  const where: any = {};
  if (filtros.asignadoId) where.asignadoId = filtros.asignadoId;
  if (filtros.contactoId) where.contactoId = filtros.contactoId;
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.soloPendientes) where.estado = { in: ['PENDIENTE', 'EN_CURSO'] };
  if (filtros.soloHoy) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const man = new Date(hoy); man.setDate(man.getDate() + 1);
    where.fechaVencimiento = { gte: hoy, lt: man };
  }
  return prisma.tareaCrm.findMany({
    where,
    include: { contacto: { select: { id: true, nombre: true, apellidos: true } }, asignado: { select: { id: true, nombre: true, apellidos: true } } },
    orderBy: [{ estado: 'asc' }, { fechaVencimiento: 'asc' }],
  });
}

export async function crearTarea(datos: { contactoId?: string; tratoId?: string; asignadoId: string; tipo: string; titulo: string; descripcion?: string; fechaVencimiento?: string; prioridad?: string; latitud?: number; longitud?: number }, usuarioId: string) {
  const tarea = await prisma.tareaCrm.create({
    data: { contactoId: datos.contactoId || null, tratoId: datos.tratoId || null, asignadoId: datos.asignadoId, tipo: datos.tipo as any, titulo: datos.titulo, descripcion: datos.descripcion || null, fechaVencimiento: datos.fechaVencimiento ? new Date(datos.fechaVencimiento) : null, prioridad: datos.prioridad || 'MEDIA', latitud: datos.latitud || null, longitud: datos.longitud || null },
  });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TAREA_CRM_CREADA', entidad: 'tarea_crm', entidadId: tarea.id } });
  return tarea;
}

export async function completarTarea(tareaId: string, usuarioId: string) {
  const t = await prisma.tareaCrm.update({ where: { id: tareaId }, data: { estado: 'COMPLETADA', fechaCompletada: new Date() } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TAREA_CRM_COMPLETADA', entidad: 'tarea_crm', entidadId: tareaId } });
  return t;
}

export async function actualizarTarea(tareaId: string, datos: Record<string, any>) {
  if (datos.fechaVencimiento) datos.fechaVencimiento = new Date(datos.fechaVencimiento);
  if (datos.estado === 'COMPLETADA') datos.fechaCompletada = new Date();
  return prisma.tareaCrm.update({ where: { id: tareaId }, data: datos });
}

// ═══ NOTAS ═══
export async function crearNota(contactoId: string, contenido: string, usuarioId: string) {
  return prisma.notaCrm.create({ data: { contactoId, autorId: usuarioId, contenido } });
}
export async function fijarNota(notaId: string, fijada: boolean) {
  return prisma.notaCrm.update({ where: { id: notaId }, data: { fijada } });
}
export async function eliminarNota(notaId: string) {
  return prisma.notaCrm.delete({ where: { id: notaId } });
}

// ═══ ARCHIVOS ═══
export async function registrarArchivo(datos: { contactoId: string; nombre: string; rutaArchivo: string; mimeType?: string; tamanoBytes?: number; descripcion?: string }, usuarioId: string) {
  return prisma.archivoCrm.create({ data: { ...datos, mimeType: datos.mimeType || null, tamanoBytes: datos.tamanoBytes || null, descripcion: datos.descripcion || null, subidoPorId: usuarioId } });
}
export async function eliminarArchivo(archivoId: string) {
  return prisma.archivoCrm.delete({ where: { id: archivoId } });
}

// ═══ DASHBOARD COMERCIAL ═══
export async function dashboardComercial(comercialId: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const man = new Date(hoy); man.setDate(man.getDate() + 1);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [totalContactos, contactosActivos, tratosAbiertos, tratosGanadosMes, valorGanadoMes, tareasHoy, tareasPendientes] = await Promise.all([
    prisma.contacto.count({ where: { comercialId, deletedAt: null } }),
    prisma.contacto.count({ where: { comercialId, deletedAt: null, estado: { notIn: ['PERDIDO', 'INACTIVO'] } } }),
    prisma.trato.count({ where: { contacto: { comercialId }, estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.count({ where: { contacto: { comercialId }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { contacto: { comercialId }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.tareaCrm.count({ where: { asignadoId: comercialId, estado: { in: ['PENDIENTE', 'EN_CURSO'] }, fechaVencimiento: { gte: hoy, lt: man } } }),
    prisma.tareaCrm.count({ where: { asignadoId: comercialId, estado: { in: ['PENDIENTE', 'EN_CURSO'] } } }),
  ]);
  return { totalContactos, contactosActivos, tratosAbiertos, tratosGanadosMes, valorGanadoMes: valorGanadoMes._sum.importe || 0, tareasHoy, tareasPendientes };
}

// ═══ KPIs DIRECCIÓN ═══
export async function kpisGeneralesCRM() {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const [totalContactos, tratosAbiertos, tratosGanados, tratosGanadosMes, valorPipeline, valorGanadoMes, totalPerdidos] = await Promise.all([
    prisma.contacto.count({ where: { deletedAt: null } }),
    prisma.trato.count({ where: { estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.count({ where: { estado: 'GANADO' } }),
    prisma.trato.count({ where: { estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.count({ where: { estado: 'PERDIDO' } }),
  ]);
  const tasaConversion = (tratosGanados + totalPerdidos) > 0 ? Math.round((tratosGanados / (tratosGanados + totalPerdidos)) * 100) : 0;
  return { totalContactos, tratosAbiertos, tratosGanadosMes, valorPipeline: valorPipeline._sum.importe || 0, valorGanadoMes: valorGanadoMes._sum.importe || 0, tasaConversion };
}

// ═══ RANKING COMERCIALES ═══
export async function rankingComerciales() {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const comerciales = await prisma.usuario.findMany({
    where: { rol: 'COMERCIAL', activo: true, deletedAt: null },
    select: { id: true, nombre: true, apellidos: true, zona: true, objetivoMensual: true, contactosComercial: { where: { deletedAt: null }, select: { id: true } } },
  });
  const results = await Promise.all(comerciales.map(async (c) => {
    const [tratosG, valorG, tratosA] = await Promise.all([
      prisma.trato.count({ where: { contacto: { comercialId: c.id }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
      prisma.trato.aggregate({ _sum: { importe: true }, where: { contacto: { comercialId: c.id }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
      prisma.trato.count({ where: { contacto: { comercialId: c.id }, estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    ]);
    return { id: c.id, nombre: `${c.nombre} ${c.apellidos}`, zona: c.zona, totalContactos: c.contactosComercial.length, tratosAbiertos: tratosA, tratosGanadosMes: tratosG, valorGanadoMes: valorG._sum.importe || 0, objetivoMensual: c.objetivoMensual || 0, cumplimiento: c.objetivoMensual ? Math.round(((valorG._sum.importe || 0) / c.objetivoMensual) * 100) : 0 };
  }));
  return results.sort((a, b) => b.valorGanadoMes - a.valorGanadoMes);
}

// ═══ CONFIG SISTEMA ═══
export async function obtenerConfigSistema() {
  let config = await prisma.configSistema.findUnique({ where: { id: 'singleton' } });
  if (!config) {
    config = await prisma.configSistema.create({ data: { id: 'singleton' } });
  }
  return config;
}

export async function actualizarConfigSistema(datos: Record<string, any>, usuarioId: string) {
  const config = await prisma.configSistema.upsert({
    where: { id: 'singleton' },
    update: datos,
    create: { id: 'singleton', ...datos },
  });
  await prisma.actividad.create({
    data: { usuarioId, accion: 'CONFIG_ACTUALIZADA', entidad: 'config_sistema', entidadId: 'singleton', detalle: JSON.stringify(datos) },
  });
  return config;
}

FILEEOF

echo '  → src/lib/constants.ts'
cat > 'src/lib/constants.ts' << 'FILEEOF'
// src/lib/constants.ts
// Constantes compartidas entre componentes

export const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  REVISION_TECNICA: { label: 'Revisión técnica', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  PREPARANDO: { label: 'Preparando', color: 'text-estado-purple', bg: 'bg-estado-purple/10', dot: 'bg-estado-purple' },
  PENDIENTE_MATERIAL: { label: 'Pte. material', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PROGRAMADA: { label: 'Programada', color: 'text-auro-orange', bg: 'bg-auro-orange/10', dot: 'bg-auro-orange' },
  INSTALANDO: { label: 'Instalando', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  TERMINADA: { label: 'Terminada', color: 'text-green-400', bg: 'bg-green-400/10', dot: 'bg-green-400' },
  INCIDENCIA: { label: 'Incidencia', color: 'text-estado-red', bg: 'bg-estado-red/10', dot: 'bg-estado-red' },
  LEGALIZACION: { label: 'Legalización', color: 'text-yellow-400', bg: 'bg-yellow-400/10', dot: 'bg-yellow-400' },
  LEGALIZADA: { label: 'Legalizada', color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  COMPLETADA: { label: 'Completada', color: 'text-green-300', bg: 'bg-green-300/10', dot: 'bg-green-300' },
  CANCELADA: { label: 'Cancelada', color: 'text-auro-navy/40', bg: 'bg-auro-navy/5', dot: 'bg-auro-navy/30' },
};

FILEEOF

echo '  → src/lib/auth.ts'
cat > 'src/lib/auth.ts' << 'FILEEOF'
// src/lib/auth.ts
// Autenticación: hashing, sesiones JWT, validación de permisos
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Rol } from '@prisma/client';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'dev-secret-cambiar');
const COOKIE_NAME = 'aurosolar_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días en segundos

// ── Hashing ──
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ──
export async function createToken(userId: string, rol: Rol): Promise<string> {
  return new SignJWT({ userId, rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: string; rol: Rol };
  } catch {
    return null;
  }
}

// ── Sesión actual ──
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, nombre: true, apellidos: true, rol: true, activo: true, clienteId: true },
  });

  if (!usuario || !usuario.activo) return null;
  return usuario;
}

// ── Establecer cookie de sesión ──
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

// ── Cerrar sesión ──
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ── RBAC: Verificar permisos ──
type Permiso = {
  roles: Rol[];
};

const PERMISOS: Record<string, Permiso> = {
  'obras:ver':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'obras:crear':      { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES'] },
  'obras:editar':     { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'obras:cambiarEstado': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'obras:eliminar':   { roles: ['ADMIN'] },

  'cobros:ver':       { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'cobros:registrar': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },

  'incidencias:ver':  { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'incidencias:crear':{ roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'incidencias:resolver': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'usuarios:ver':       { roles: ['ADMIN'] },
  'usuarios:gestionar': { roles: ['ADMIN'] },
  'dashboard:ver':    { roles: ['ADMIN', 'DIRECCION'] },
  'legalizacion:ver': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'legalizacion:gestionar': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'portal:ver':       { roles: ['CLIENTE'] },
  'portal:soporte':   { roles: ['CLIENTE'] },

  'campo:checkin':    { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:gastos':     { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:validar':    { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },

  'crm:ver':          { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:gestionar':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:crear':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:editar':       { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:convertir':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },

  'tareas-crm:ver':     { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:crear':   { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:editar':  { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },

  'planificacion:ver':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'planificacion:gestionar': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'materiales:ver':          { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'materiales:solicitar':    { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'materiales:aprobar':      { roles: ['ADMIN', 'DIRECCION'] },

  'activos:ver':             { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'activos:gestionar':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'config:ver':       { roles: ['ADMIN', 'DIRECCION'] },
  'config:editar':    { roles: ['ADMIN'] },

  // CRM V2 — Contactos, Tratos, Tareas
  'contactos:ver':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:crear':  { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:editar': { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:convertir': { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:ver':       { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:crear':     { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:editar':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:convertir': { roles: ['ADMIN', 'DIRECCION'] },
  'tareas-crm:ver':   { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:crear': { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:editar':{ roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },

  'exportar:ver':     { roles: ['ADMIN', 'DIRECCION'] },
  'comisiones:ver':   { roles: ['ADMIN', 'DIRECCION'] },
  'comisiones:gestionar': { roles: ['ADMIN', 'DIRECCION'] },
};

export function tienePermiso(rol: Rol, permiso: string): boolean {
  const config = PERMISOS[permiso];
  if (!config) return false;
  return config.roles.includes(rol);
}

FILEEOF

echo '  → prisma/schema.prisma'
cat > 'prisma/schema.prisma' << 'FILEEOF'
// ═══════════════════════════════════════════════════════════
// AURO SOLAR ENERGÍA — Modelo de Datos (Prisma Schema)
// Basado en: Modelo de Datos, Especificaciones, Automatizaciones
// ═══════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// USUARIOS Y ROLES
// ═══════════════════════════════════════════

enum Rol {
  ADMIN
  DIRECCION
  COMERCIAL
  JEFE_INSTALACIONES
  INSTALADOR
  ADMINISTRACION
  CLIENTE
}

model Usuario {
  id            String    @id @default(uuid())
  email         String    @unique
  nombre        String
  apellidos     String    @default("")
  passwordHash  String    @map("password_hash")
  rol           Rol
  activo        Boolean   @default(true)
  telefono      String?
  avatarUrl     String?   @map("avatar_url")
  zona          String?   // Para comerciales
  objetivoMensual Int?    @map("objetivo_mensual") // Céntimos, para comerciales
  clienteId     String?  @map("cliente_id") // Para rol CLIENTE: enlace con su ficha

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  // Relaciones
  obrasComercial     Obra[]            @relation("ObraComercial")
  obrasInstalador    ObraInstalador[]
  checkins           Checkin[]
  gastosRegistrados  Gasto[]
  validaciones       Validacion[]
  incidenciasCreadas Incidencia[]      @relation("IncidenciaCreador")
  incidenciasAsignadas Incidencia[]    @relation("IncidenciaAsignado")
  notificaciones   Notificacion[]
  pagosRegistrados   Pago[]
  documentosSubidos  Documento[]
  actividadesUsuario Actividad[]
  subvencionesResponsable Subvencion[] @relation("SubvencionResponsable")
  checklistCreados ChecklistValidacion[] @relation("ChecklistCreador")
  leadsAsignados     Lead[]
  visitasComercial   Visita[]
  sesiones           Session[]
  // CRM V2
  contactosComercial Contacto[]        @relation("ContactoComercial")
  tareasAsignadas    TareaCrm[]        @relation("TareaAsignada")
  notasAutor         NotaCrm[]         @relation("NotaAutor")
  archivosSubidos    ArchivoCrm[]      @relation("ArchivoSubidoPor")

  @@map("usuarios")
}

model Session {
  id            String   @id @default(uuid())
  usuarioId     String   @map("usuario_id")
  token         String   @unique
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")

  usuario       Usuario  @relation(fields: [usuarioId], references: [id])

  @@map("sessions")
}

// ═══════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════

model Cliente {
  id            String    @id @default(uuid())
  nombre        String
  apellidos     String    @default("")
  dniCif        String?   @unique @map("dni_cif")
  direccion     String?
  codigoPostal  String?   @map("codigo_postal")
  localidad     String?
  provincia     String?
  telefono      String?
  email         String?
  notas         String?

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  // Relaciones
  obras         Obra[]
  leads         Lead[]
  contactos     Contacto[]

  @@map("clientes")
}

// ═══════════════════════════════════════════
// CRM: LEADS Y OPORTUNIDADES
// ═══════════════════════════════════════════

enum EstadoLead {
  NUEVO
  CONTACTADO
  VISITA_PROGRAMADA
  PRESUPUESTO_ENVIADO
  ACEPTADO
  NO_INTERESADO
  CONVERTIDO
}

enum OrigenLead {
  WEB
  RECOMENDACION
  FERIA
  PUERTA_FRIA
  REPETIDOR
  TELEFONO
  OTRO
}

enum TipoInstalacion {
  RESIDENCIAL
  INDUSTRIAL
  AGROINDUSTRIAL
  BATERIA
  AEROTERMIA
  BESS
  BACKUP
}

model Lead {
  id                String       @id @default(uuid())
  nombre            String
  apellidos         String       @default("")
  telefono          String?
  email             String?
  direccion         String?
  localidad         String?
  provincia         String?
  origen            OrigenLead
  tipo              TipoInstalacion
  estado            EstadoLead   @default(NUEVO)
  potenciaEstimada  Float?       @map("potencia_estimada_kwp") // kWp
  importeEstimado   Int?         @map("importe_estimado") // Céntimos
  notas             String?

  comercialId       String?      @map("comercial_id")
  clienteId         String?      @map("cliente_id")
  obraId            String?      @unique @map("obra_id") // Si se convirtió

  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")
  deletedAt         DateTime?    @map("deleted_at")

  // Relaciones
  comercial         Usuario?     @relation(fields: [comercialId], references: [id])
  cliente           Cliente?     @relation(fields: [clienteId], references: [id])
  obra              Obra?        @relation(fields: [obraId], references: [id])
  visitas           Visita[]

  @@map("leads")
}

model Visita {
  id            String    @id @default(uuid())
  leadId        String    @map("lead_id")
  comercialId   String    @map("comercial_id")
  fecha         DateTime
  resultado     String    // Interesado, Pide presupuesto, No interesado, Reprogramar
  notas         String?
  fotoCubiertaUrl String? @map("foto_cubierta_url")

  createdAt     DateTime  @default(now()) @map("created_at")

  // Relaciones
  lead          Lead      @relation(fields: [leadId], references: [id])
  comercial     Usuario   @relation(fields: [comercialId], references: [id])

  @@map("visitas")
}

// ═══════════════════════════════════════════
// OBRAS (entidad central)
// ═══════════════════════════════════════════

enum EstadoObra {
  REVISION_TECNICA
  PREPARANDO
  PENDIENTE_MATERIAL
  PROGRAMADA
  INSTALANDO
  TERMINADA
  INCIDENCIA
  LEGALIZACION
  LEGALIZADA
  COMPLETADA
  CANCELADA
}

enum EstadoLegalizacion {
  NO_APLICA
  PENDIENTE
  SOLICITADA
  EN_TRAMITE
  APROBADA
  INSCRITA
}

model Obra {
  id                String           @id @default(uuid())
  codigo            String           @unique // A-YYYY-MM-XXX
  clienteId         String           @map("cliente_id")
  tipo              TipoInstalacion
  estado            EstadoObra       @default(REVISION_TECNICA)
  estadoLegalizacion EstadoLegalizacion @default(PENDIENTE) @map("estado_legalizacion")

  // Datos técnicos
  direccionInstalacion String?       @map("direccion_instalacion")
  localidad         String?
  provincia         String?
  potenciaKwp       Float?           @map("potencia_kwp")
  numPaneles        Int?             @map("num_paneles")
  marcaPaneles      String?          @map("marca_paneles")
  inversor          String?
  bateriaKwh        Float?           @map("bateria_kwh")

  // Económico (todo en céntimos)
  presupuestoTotal  Int              @default(0) @map("presupuesto_total")
  costeTotal        Int              @default(0) @map("coste_total")

  // Fechas clave
  fechaCreacion     DateTime         @default(now()) @map("fecha_creacion")
  fechaProgramada   DateTime?        @map("fecha_programada")
  fechaInicio       DateTime?        @map("fecha_inicio")
  fechaFin          DateTime?        @map("fecha_fin")
  fechaLegalizacion DateTime?        @map("fecha_legalizacion")

  // Legalización
  expedienteLegal   String?          @map("expediente_legal")
  notasLegalizacion String?          @map("notas_legalizacion")

  // Responsables
  comercialId       String?          @map("comercial_id")
  notas             String?

  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")
  deletedAt         DateTime?        @map("deleted_at")

  // Relaciones
  cliente           Cliente          @relation(fields: [clienteId], references: [id])
  comercial         Usuario?         @relation("ObraComercial", fields: [comercialId], references: [id])
  instaladores      ObraInstalador[]
  planPagos         PlanPago[]
  pagos             Pago[]
  documentos        Documento[]
  checkins          Checkin[]
  gastos            Gasto[]
  validaciones      Validacion[]
  incidencias       Incidencia[]
  activos           ActivoInstalado[]
  actividades       Actividad[]
  solicitudesMaterial SolicitudMaterial[]
  lead              Lead?
  comision          Comision?
  subvenciones      Subvencion[]
  checklistValidaciones ChecklistValidacion[]
  trato             Trato?           @relation("TratoObra")

  @@map("obras")
}

// Tabla intermedia para asignación de instaladores a obras
model ObraInstalador {
  id            String   @id @default(uuid())
  obraId        String   @map("obra_id")
  instaladorId  String   @map("instalador_id")
  esJefe        Boolean  @default(false) @map("es_jefe")

  createdAt     DateTime @default(now()) @map("created_at")

  obra          Obra     @relation(fields: [obraId], references: [id])
  instalador    Usuario  @relation(fields: [instaladorId], references: [id])

  @@unique([obraId, instaladorId])
  @@map("obra_instaladores")
}

// ═══════════════════════════════════════════
// COBROS Y PAGOS
// ═══════════════════════════════════════════

enum MetodoPago {
  TRANSFERENCIA
  EFECTIVO
  FINANCIACION
  TARJETA
  DOMICILIACION
}

model PlanPago {
  id            String    @id @default(uuid())
  obraId        String    @map("obra_id")
  concepto      String    // "Anticipo 50%", "Fin obra 40%", "Tras legalización 10%"
  importe       Int       // Céntimos
  orden         Int       @default(0)
  fechaPrevista DateTime? @map("fecha_prevista")
  pagado        Boolean   @default(false)

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  obra          Obra      @relation(fields: [obraId], references: [id])

  @@map("plan_pagos")
}

model Pago {
  id            String     @id @default(uuid())
  obraId        String     @map("obra_id")
  importe       Int        // Céntimos
  metodo        MetodoPago
  fechaCobro    DateTime   @map("fecha_cobro")
  concepto      String?
  justificanteUrl String?  @map("justificante_url")
  efectivoIngresado Boolean @default(false) @map("efectivo_ingresado") // Solo para efectivo

  registradoPorId String  @map("registrado_por_id")

  createdAt     DateTime  @default(now()) @map("created_at")

  obra          Obra      @relation(fields: [obraId], references: [id])
  registradoPor Usuario   @relation(fields: [registradoPorId], references: [id])

  @@map("pagos")
}

model Comision {
  id            String   @id @default(uuid())
  obraId        String   @unique @map("obra_id")
  comercialEmail String  @map("comercial_email")
  presupuesto   Int      // Céntimos
  porcentaje    Float    // 0.03 = 3%
  importe       Int      // Céntimos
  estado        String   @default("PENDIENTE") // PENDIENTE, PAGADA

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  obra          Obra     @relation(fields: [obraId], references: [id])

  @@map("comisiones")
}

// ═══════════════════════════════════════════
// DOCUMENTOS
// ═══════════════════════════════════════════

enum TipoDocumento {
  PRESUPUESTO
  CONTRATO
  FACTURA
  BOLETIN
  CERTIFICADO
  MEMORIA_TECNICA
  FOTO_INSTALACION
  FOTO_INVERSOR
  FOTO_PANELES
  FOTO_CUADRO
  FOTO_GENERAL
  JUSTIFICANTE_PAGO
  TICKET_GASTO
  SUBVENCION
  OTRO
}

model Documento {
  id            String        @id @default(uuid())
  obraId        String        @map("obra_id")
  tipo          TipoDocumento
  nombre        String
  descripcion   String?
  rutaArchivo   String        @map("ruta_archivo")
  mimeType      String?       @map("mime_type")
  tamanoBytes   Int?          @map("tamano_bytes")
  estado        String        @default("ACTIVO") // ACTIVO, APROBADO, RECHAZADO
  visible       Boolean       @default(false) // Visible en portal cliente
  url           String?       // URL pública o enlace de descarga

  subidoPorId   String        @map("subido_por_id")

  createdAt     DateTime      @default(now()) @map("created_at")
  deletedAt     DateTime?     @map("deleted_at")

  obra          Obra          @relation(fields: [obraId], references: [id])
  subidoPor     Usuario       @relation(fields: [subidoPorId], references: [id])

  @@map("documentos")
}

// ═══════════════════════════════════════════
// CAMPO: CHECKINS, GASTOS, VALIDACIONES
// ═══════════════════════════════════════════

model Checkin {
  id            String    @id @default(uuid())
  obraId        String    @map("obra_id")
  instaladorId  String    @map("instalador_id")
  horaEntrada   DateTime  @map("hora_entrada")
  horaSalida    DateTime? @map("hora_salida")
  fotoUrl       String?   @map("foto_url")
  nota          String?
  latitud       Float?
  longitud      Float?

  createdAt     DateTime  @default(now()) @map("created_at")

  obra          Obra      @relation(fields: [obraId], references: [id])
  instalador    Usuario   @relation(fields: [instaladorId], references: [id])

  @@map("checkins")
}

enum TipoGasto {
  MATERIAL_EXTRA
  COMBUSTIBLE
  DIETA
  PARKING_PEAJE
  HERRAMIENTA
  OTRO
}

model Gasto {
  id            String    @id @default(uuid())
  obraId        String    @map("obra_id")
  tipo          TipoGasto
  importe       Int       // Céntimos
  descripcion   String?
  fotoTicketUrl String?   @map("foto_ticket_url")

  registradoPorId String @map("registrado_por_id")

  createdAt     DateTime  @default(now()) @map("created_at")

  obra          Obra      @relation(fields: [obraId], references: [id])
  registradoPor Usuario   @relation(fields: [registradoPorId], references: [id])

  @@map("gastos")
}

model Validacion {
  id            String    @id @default(uuid())
  obraId        String    @map("obra_id")
  potenciaReal  Float?    @map("potencia_real_kwp")
  numPanelesReal Int?     @map("num_paneles_real")
  fotoInversorUrl String? @map("foto_inversor_url")
  fotoPanelesUrl  String? @map("foto_paneles_url")
  fotoCuadroUrl   String? @map("foto_cuadro_url")
  fotoGeneralUrl  String? @map("foto_general_url")
  observaciones String?
  completa      Boolean   @default(false)

  validadoPorId String    @map("validado_por_id")

  createdAt     DateTime  @default(now()) @map("created_at")

  obra          Obra      @relation(fields: [obraId], references: [id])
  validadoPor   Usuario   @relation(fields: [validadoPorId], references: [id])

  @@map("validaciones")
}

// ═══════════════════════════════════════════
// INCIDENCIAS
// ═══════════════════════════════════════════

enum Gravedad {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

enum EstadoIncidencia {
  ABIERTA
  EN_PROCESO
  RESUELTA
  CERRADA
}

model Incidencia {
  id            String           @id @default(uuid())
  obraId        String           @map("obra_id")
  gravedad      Gravedad
  estado        EstadoIncidencia @default(ABIERTA)
  descripcion   String
  fotoUrl       String?          @map("foto_url")
  notasResolucion String?        @map("notas_resolucion")

  creadoPorId   String?          @map("creado_por_id")
  asignadoAId   String?          @map("asignado_a_id")
  origenPortal  Boolean          @default(false) @map("origen_portal")

  fechaResolucion DateTime?      @map("fecha_resolucion")

  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  obra          Obra             @relation(fields: [obraId], references: [id])
  creadoPor     Usuario?         @relation("IncidenciaCreador", fields: [creadoPorId], references: [id])
  asignadoA     Usuario?         @relation("IncidenciaAsignado", fields: [asignadoAId], references: [id])

  @@map("incidencias")
}

// ═══════════════════════════════════════════
// MATERIALES
// ═══════════════════════════════════════════

enum EstadoSolicitud {
  BORRADOR
  ENVIADA
  APROBADA
  RECHAZADA
  PEDIDA
  RECIBIDA_PARCIAL
  RECIBIDA
}

model SolicitudMaterial {
  id            String          @id @default(uuid())
  obraId        String          @map("obra_id")
  estado        EstadoSolicitud @default(BORRADOR)
  proveedor     String?
  costeTotal    Int             @default(0) @map("coste_total") // Céntimos
  notas         String?
  fechaEntregaPrevista DateTime? @map("fecha_entrega_prevista")

  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  obra          Obra            @relation(fields: [obraId], references: [id])
  lineas        LineaMaterial[]

  @@map("solicitudes_material")
}

model LineaMaterial {
  id            String   @id @default(uuid())
  solicitudId   String   @map("solicitud_id")
  producto      String
  cantidad      Int
  costeUnitario Int      @default(0) @map("coste_unitario") // Céntimos
  recibido      Int      @default(0)

  solicitud     SolicitudMaterial @relation(fields: [solicitudId], references: [id], onDelete: Cascade)

  @@map("lineas_material")
}

// ═══════════════════════════════════════════
// ACTIVOS INSTALADOS (post-obra)
// ═══════════════════════════════════════════

model ActivoInstalado {
  id            String    @id @default(uuid())
  obraId        String    @map("obra_id")
  clienteId     String?   @map("cliente_id") // Denormalizado para acceso rápido
  tipo          String    // Panel, Inversor, Batería, Estructura, Aerotermia
  marca         String?
  modelo        String?
  numeroSerie   String?   @map("numero_serie")
  potencia      Float?    // kWp o kW según tipo
  fechaInstalacion DateTime? @map("fecha_instalacion")
  garantiaHasta DateTime? @map("garantia_hasta")
  activo        Boolean   @default(true)

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  obra          Obra      @relation(fields: [obraId], references: [id])
  mantenimientos Mantenimiento[]

  @@map("activos_instalados")
}

// ═══════════════════════════════════════════
// MANTENIMIENTO (cuelga de ACTIVO)
// ═══════════════════════════════════════════

enum EstadoMantenimiento {
  PROGRAMADO
  EN_CURSO
  COMPLETADO
  CANCELADO
}

model Mantenimiento {
  id            String              @id @default(uuid())
  activoId      String              @map("activo_id")
  tipo          String              // Preventivo, Correctivo, Limpieza, Revisión
  estado        EstadoMantenimiento @default(PROGRAMADO)
  fechaProgramada DateTime?         @map("fecha_programada")
  fechaRealizada  DateTime?         @map("fecha_realizada")
  descripcion   String?
  resultado     String?
  coste         Int?                // Céntimos

  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  activo        ActivoInstalado     @relation(fields: [activoId], references: [id])

  @@map("mantenimientos")
}

// ═══════════════════════════════════════════
// AUDITORÍA (ACTIVIDAD / TIMELINE)
// ═══════════════════════════════════════════

model Actividad {
  id            String   @id @default(uuid())
  obraId        String?  @map("obra_id")
  usuarioId     String   @map("usuario_id")
  accion        String   // ESTADO_CAMBIADO, PAGO_REGISTRADO, DOCUMENTO_SUBIDO, etc.
  entidad       String   // obra, pago, incidencia, etc.
  entidadId     String?  @map("entidad_id")
  detalle       String?  // JSON con datos relevantes (antes/después)

  createdAt     DateTime @default(now()) @map("created_at")

  obra          Obra?    @relation(fields: [obraId], references: [id])
  usuario       Usuario  @relation(fields: [usuarioId], references: [id])

  @@index([obraId, createdAt])
  @@index([usuarioId, createdAt])
  @@index([entidad, entidadId])
  @@map("actividades")
}

// ═══════════════════════════════════════════
// CATÁLOGOS (configuración del sistema)
// ═══════════════════════════════════════════

model Catalogo {
  id        String   @id @default(uuid())
  tipo      String   // ESTADO_OBRA, TIPO_INSTALACION, METODO_PAGO, etc.
  codigo    String
  nombre    String
  orden     Int      @default(0)
  activo    Boolean  @default(true)
  metadata  String?  // JSON para datos extra (color, icono, etc.)

  @@unique([tipo, codigo])
  @@map("catalogos")
}

// ═══════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════

enum SeveridadNotificacion {
  INFO
  WARNING
  CRITICAL
}

model Notificacion {
  id            String                  @id @default(uuid())
  usuarioId     String                  @map("usuario_id")
  titulo        String
  mensaje       String
  severidad     SeveridadNotificacion   @default(INFO)
  tipo          String?                 // COBRO_PENDIENTE, INCIDENCIA, MATERIAL, OBRA_ESTADO, etc.
  enlace        String?                 // URL relativa: /obras/xxx, /cobros, etc.
  entidadTipo   String?                 @map("entidad_tipo")  // obra, incidencia, solicitud_material...
  entidadId     String?                 @map("entidad_id")
  leida         Boolean                 @default(false)
  expiradaAt    DateTime?               @map("expirada_at")

  createdAt     DateTime                @default(now()) @map("created_at")

  usuario       Usuario                 @relation(fields: [usuarioId], references: [id])

  @@index([usuarioId, leida])
  @@map("notificaciones")
}

// ── Subvenciones ──
enum EstadoSubvencion {
  PENDIENTE
  SOLICITADA
  EN_TRAMITE
  APROBADA
  DENEGADA
  COBRADA
  CADUCADA
}

enum TipoSubvencion {
  NEXT_GENERATION
  AUTOCONSUMO_CCAA
  PLAN_MOVES
  IDAE
  MUNICIPAL
  OTRA
}

model Subvencion {
  id              String            @id @default(uuid())
  obraId          String            @map("obra_id")
  tipo            TipoSubvencion
  estado          EstadoSubvencion  @default(PENDIENTE)
  programa        String?           // Nombre del programa
  convocatoria    String?           // Ref. convocatoria
  expediente      String?           // Nº expediente
  importeSolicitado Int             @default(0) @map("importe_solicitado") // Céntimos
  importeAprobado   Int?            @map("importe_aprobado") // Céntimos
  importeCobrado    Int?            @map("importe_cobrado") // Céntimos
  fechaSolicitud    DateTime?       @map("fecha_solicitud")
  fechaAprobacion   DateTime?       @map("fecha_aprobacion")
  fechaCobro        DateTime?       @map("fecha_cobro")
  fechaLimite       DateTime?       @map("fecha_limite") // Fecha máx. para cobrar/caducar
  notas             String?
  responsableId     String?         @map("responsable_id")

  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  obra            Obra              @relation(fields: [obraId], references: [id])
  responsable     Usuario?          @relation("SubvencionResponsable", fields: [responsableId], references: [id])

  @@index([obraId])
  @@index([estado])
  @@map("subvenciones")
}

// ── Validación avanzada ──
enum ResultadoValidacion {
  OK
  OK_CON_OBS
  NO_OK
  BORRADOR
}

model ChecklistValidacion {
  id            String              @id @default(uuid())
  obraId        String              @map("obra_id")
  resultado     ResultadoValidacion @default(BORRADOR)
  // Configuración instalada (confirmada o editada)
  panelConfirmado    Boolean        @default(true) @map("panel_confirmado")
  kWpReal            Float?         @map("kwp_real")
  panelesReal        Int?           @map("paneles_real")
  inversorReal       String?        @map("inversor_real")
  bateriaReal        String?        @map("bateria_real")
  estructuraReal     String?        @map("estructura_real")
  // Seriales
  serialInversor     String?        @map("serial_inversor")
  serialBateria      String?        @map("serial_bateria")
  serialSmartMeter   String?        @map("serial_smart_meter")
  // Observaciones
  observaciones      String?
  // Fotos URLs (JSON array)
  fotosJson          String?        @map("fotos_json")

  creadoPorId   String              @map("creado_por_id")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  obra          Obra                @relation(fields: [obraId], references: [id])
  creadoPor     Usuario             @relation("ChecklistCreador", fields: [creadoPorId], references: [id])
  items         ChecklistItem[]

  @@index([obraId])
  @@map("checklist_validaciones")
}

model ChecklistItem {
  id              String   @id @default(uuid())
  checklistId     String   @map("checklist_id")
  codigo          String   // INV_ARRANCA, PRODUCCION_OK, etc.
  pregunta        String
  critico         Boolean  @default(false)
  respuesta       String?  // SI, NO, NA
  notas           String?

  checklist       ChecklistValidacion @relation(fields: [checklistId], references: [id], onDelete: Cascade)

  @@map("checklist_items")
}

// ── Configuración del sistema (branding, etc.) ──
model ConfigSistema {
  id            String   @id @default("singleton")
  nombreEmpresa String   @default("Auro Solar") @map("nombre_empresa")
  logoUrl       String?  @map("logo_url")
  colorPrimario String   @default("#F58216") @map("color_primario")
  colorSecundario String @default("#1A2E4A") @map("color_secundario")
  colorAccent   String   @default("#F58216") @map("color_accent")

  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("config_sistema")
}

// ── CRM Avanzado: Contactos (posibles clientes) ──
enum EstadoContacto {
  POSIBLE_CLIENTE
  CUALIFICADO
  CLIENTE
  PERDIDO
  INACTIVO
}

model Contacto {
  id              String          @id @default(uuid())
  nombre          String
  apellidos       String          @default("")
  empresa         String?
  telefono        String?
  email           String?
  direccion       String?
  localidad       String?
  provincia       String?
  codigoPostal    String?         @map("codigo_postal")
  estado          EstadoContacto  @default(POSIBLE_CLIENTE)
  tipoInteres     TipoInstalacion? @map("tipo_interes")
  origen          OrigenLead?
  comercialId     String?         @map("comercial_id")
  clienteId       String?         @map("cliente_id") // Cuando se convierte a cliente

  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  deletedAt       DateTime?       @map("deleted_at")

  comercial       Usuario?        @relation("ContactoComercial", fields: [comercialId], references: [id])
  cliente         Cliente?        @relation(fields: [clienteId], references: [id])
  tratos          Trato[]
  tareasCrm       TareaCrm[]
  notasCrm        NotaCrm[]
  archivosCrm     ArchivoCrm[]

  @@index([comercialId])
  @@index([estado])
  @@map("contactos")
}

// ── CRM: Tratos / Oportunidades ──
enum EstadoTrato {
  NUEVO_CONTACTO
  VISITA_AGENDADA
  A_LA_ESPERA_PRESUPUESTO
  PRESUPUESTO_ENVIADO
  NEGOCIACION
  GANADO
  PERDIDO
}

model Trato {
  id              String       @id @default(uuid())
  contactoId      String       @map("contacto_id")
  titulo          String
  estado          EstadoTrato  @default(NUEVO)
  importe         Int?         // Céntimos
  tipo            TipoInstalacion?
  potenciaEstimada Float?      @map("potencia_estimada")
  fechaCierre     DateTime?    @map("fecha_cierre")
  obraId          String?      @unique @map("obra_id") // Si se convirtió en obra
  notas           String?
  motivoPerdido   String?      @map("motivo_perdido") // Razón si estado = PERDIDO

  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  contacto        Contacto     @relation(fields: [contactoId], references: [id])
  obra            Obra?        @relation("TratoObra", fields: [obraId], references: [id])

  @@index([contactoId])
  @@index([estado])
  @@map("tratos")
}

// ── CRM: Tareas (llamadas, emails, reuniones, seguimiento) ──
enum TipoTarea {
  LLAMADA
  EMAIL
  REUNION
  VISITA
  PRESUPUESTO
  SEGUIMIENTO
  OTRO
}

enum EstadoTarea {
  PENDIENTE
  EN_CURSO
  COMPLETADA
  CANCELADA
}

model TareaCrm {
  id              String       @id @default(uuid())
  contactoId      String?      @map("contacto_id")
  tratoId         String?      @map("trato_id")
  asignadoId      String       @map("asignado_id")
  tipo            TipoTarea
  estado          EstadoTarea  @default(PENDIENTE)
  titulo          String
  descripcion     String?
  fechaVencimiento DateTime?   @map("fecha_vencimiento")
  fechaCompletada DateTime?    @map("fecha_completada")
  prioridad       String       @default("MEDIA") // ALTA, MEDIA, BAJA
  // Geolocalización
  latitud         Float?
  longitud        Float?

  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  contacto        Contacto?    @relation(fields: [contactoId], references: [id])
  asignado        Usuario      @relation("TareaAsignada", fields: [asignadoId], references: [id])

  @@index([asignadoId, estado])
  @@index([contactoId])
  @@map("tareas_crm")
}

// ── CRM: Notas / Reportes ──
model NotaCrm {
  id              String    @id @default(uuid())
  contactoId      String    @map("contacto_id")
  autorId         String    @map("autor_id")
  contenido       String
  fijada          Boolean   @default(false)

  createdAt       DateTime  @default(now()) @map("created_at")

  contacto        Contacto  @relation(fields: [contactoId], references: [id])
  autor           Usuario   @relation("NotaAutor", fields: [autorId], references: [id])

  @@index([contactoId])
  @@map("notas_crm")
}

// ── CRM: Archivos adjuntos ──
model ArchivoCrm {
  id              String    @id @default(uuid())
  contactoId      String    @map("contacto_id")
  nombre          String
  rutaArchivo     String    @map("ruta_archivo")
  mimeType        String?   @map("mime_type")
  tamanoBytes     Int?      @map("tamano_bytes")
  descripcion     String?
  subidoPorId     String    @map("subido_por_id")

  createdAt       DateTime  @default(now()) @map("created_at")

  contacto        Contacto  @relation(fields: [contactoId], references: [id])
  subidoPor       Usuario   @relation("ArchivoSubidoPor", fields: [subidoPorId], references: [id])

  @@index([contactoId])
  @@map("archivos_crm")
}

FILEEOF

echo '  → src/services/export.service.ts'
cat > 'src/services/export.service.ts' << 'FILEEOF'
// src/services/export.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Exportar obras a CSV ──
export async function exportarObrasCSV() {
  const obras = await prisma.obra.findMany({
    where: { deletedAt: null },
    include: {
      cliente: { select: { nombre: true, apellidos: true, dniCif: true } },
      comercial: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'Código;Cliente;DNI/CIF;Estado;Tipo;Localidad;Provincia;Potencia kWp;Paneles;Inversor;Presupuesto;Coste;Comercial;Creada';
  const rows = obras.map(o => [
    o.codigo,
    `${o.cliente.nombre} ${o.cliente.apellidos || ''}`.trim(),
    o.cliente.dniCif || '',
    o.estado,
    o.tipo,
    o.localidad || '',
    o.provincia || '',
    o.potenciaKwp || '',
    o.numPaneles || '',
    o.inversor || '',
    (o.presupuestoTotal / 100).toFixed(2),
    (o.costeTotal / 100).toFixed(2),
    o.comercial?.nombre || '',
    ''
    new Date(o.createdAt).toLocaleDateString('es-ES'),
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── Exportar clientes a CSV ──
export async function exportarClientesCSV() {
  const clientes = await prisma.cliente.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { obras: true } } },
    orderBy: { nombre: 'asc' },
  });

  const header = 'Nombre;Apellidos;DNI/CIF;Teléfono;Email;Dirección;CP;Localidad;Provincia;Nº Obras;Creado';
  const rows = clientes.map(c => [
    c.nombre, c.apellidos || '', c.dniCif || '', c.telefono || '',
    c.email || '', c.direccion || '', c.codigoPostal || '',
    c.localidad || '', c.provincia || '', c._count.obras,
    new Date(c.createdAt).toLocaleDateString('es-ES'),
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── Exportar cobros a CSV ──
export async function exportarCobrosCSV() {
  const pagos = await prisma.pago.findMany({
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true } } } },
      registradoPor: { select: { nombre: true } },
    },
    orderBy: { fechaCobro: 'desc' },
  });

  const header = 'Obra;Cliente;Importe;Método;Fecha;Concepto;Registrado por';
  const rows = pagos.map(p => [
    p.obra.codigo,
    p.obra.cliente.nombre,
    (p.importe / 100).toFixed(2),
    p.metodo,
    new Date(p.fechaCobro).toLocaleDateString('es-ES'),
    p.concepto || '',
    p.registradoPor.nombre,
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── GDPR: Exportar datos de un cliente ──
export async function exportarDatosCliente(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      obras: {
        include: {
          pagos: true,
          incidencias: true,
          documentos: { where: { deletedAt: null } },
        },
      },
      leads: true,
    },
  });
  if (!cliente) throw new Error('Cliente no encontrado');
  return cliente;
}

// ── GDPR: Anonimizar cliente ──
export async function anonimizarCliente(clienteId: string, usuarioId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new Error('Cliente no encontrado');

  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      nombre: 'ANONIMIZADO',
      apellidos: '',
      dniCif: null,
      telefono: null,
      email: null,
      direccion: null,
      codigoPostal: null,
      localidad: null,
      provincia: null,
      notas: null,
      deletedAt: new Date(),
    },
  });

  await prisma.actividad.create({
    data: {
      usuarioId,
      accion: 'GDPR_ANONIMIZADO',
      entidad: 'cliente',
      entidadId: clienteId,
      detalle: JSON.stringify({ nombre_original: cliente.nombre }),
    },
  });

  logger.info('gdpr_anonimizado', { clienteId });
  return { ok: true };
}

FILEEOF

echo '  → src/services/validacion-avanzada.service.ts'
cat > 'src/services/validacion-avanzada.service.ts' << 'FILEEOF'
// src/services/validacion-avanzada.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Ítems del checklist con indicador crítico
export const CHECKLIST_ITEMS = [
  { codigo: 'INV_ARRANCA', pregunta: 'Inversor arranca y produce', critico: true },
  { codigo: 'PRODUCCION_OK', pregunta: 'Producción instantánea verificada en app', critico: true },
  { codigo: 'MONITORIZACION', pregunta: 'Monitorización dada de alta', critico: true },
  { codigo: 'PROTECCIONES_AC', pregunta: 'Protecciones AC instaladas (MT + diferencial)', critico: true },
  { codigo: 'SPD_INSTALADO', pregunta: 'SPD instalado', critico: true },
  { codigo: 'FUSIBLES_DC', pregunta: 'Fusibles DC correctos (si aplica)', critico: false },
  { codigo: 'SMART_METER', pregunta: 'Smart meter instalado (si aplica)', critico: false },
  { codigo: 'BATERIA_COM', pregunta: 'Comunicación batería OK (si aplica)', critico: false },
  { codigo: 'BACKUP_EPS', pregunta: 'Test backup/EPS OK (si aplica)', critico: false },
  { codigo: 'SELLADO_CUBIERTA', pregunta: 'Sellado cubierta / anclajes OK', critico: true },
];

// ── Obtener datos pre-cargados de la obra ──
export async function datosPreCarga(obraId: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true, codigo: true, potenciaKwp: true, numPaneles: true,
      inversor: true, bateriaKwh: true, marcaPaneles: true, tipo: true,
      cliente: { select: { nombre: true, apellidos: true } },
    },
  });
  if (!obra) throw new Error('Obra no encontrada');
  return {
    ...obra,
    checklistItems: CHECKLIST_ITEMS,
    tienesBateria: (obra.bateriaKwh || 0) > 0,
  };
}

// ── Crear o actualizar validación ──
export async function guardarValidacion(input: {
  obraId: string;
  resultado: string;
  panelConfirmado: boolean;
  kWpReal?: number;
  panelesReal?: number;
  inversorReal?: string;
  bateriaReal?: string;
  estructuraReal?: string;
  serialInversor?: string;
  serialBateria?: string;
  serialSmartMeter?: string;
  observaciones?: string;
  fotosJson?: string;
  items: Array<{ codigo: string; respuesta: string; notas?: string }>;
}, usuarioId: string) {
  // Check si hay items críticos en NO
  const criticos = CHECKLIST_ITEMS.filter(i => i.critico);
  const criticosFallidos = input.items.filter(i => {
    const def = criticos.find(c => c.codigo === i.codigo);
    return def && i.respuesta === 'NO';
  });

  // Auto-determinar resultado si no se fuerza
  let resultado = input.resultado;
  if (criticosFallidos.length > 0 && resultado === 'OK') {
    resultado = 'NO_OK';
  }

  const checklist = await prisma.checklistValidacion.create({
    data: {
      obraId: input.obraId,
      resultado: resultado as any,
      panelConfirmado: input.panelConfirmado,
      kWpReal: input.kWpReal,
      panelesReal: input.panelesReal,
      inversorReal: input.inversorReal,
      bateriaReal: input.bateriaReal,
      estructuraReal: input.estructuraReal,
      serialInversor: input.serialInversor,
      serialBateria: input.serialBateria,
      serialSmartMeter: input.serialSmartMeter,
      observaciones: input.observaciones,
      fotosJson: input.fotosJson,
      creadoPorId: usuarioId,
      items: {
        create: input.items.map(i => {
          const def = CHECKLIST_ITEMS.find(d => d.codigo === i.codigo);
          return {
            codigo: i.codigo,
            pregunta: def?.pregunta || i.codigo,
            critico: def?.critico || false,
            respuesta: i.respuesta,
            notas: i.notas,
          };
        }),
      },
    },
  });

  // Si resultado OK → cambiar estado obra + crear activos
  if (resultado === 'OK' || resultado === 'OK_CON_OBS') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: { estado: 'TERMINADA' },
    });

    // Crear activos instalados con seriales
    const obra = await prisma.obra.findUnique({
      where: { id: input.obraId },
      select: { clienteId: true, inversor: true, marcaPaneles: true, bateriaKwh: true },
    });

    if (obra) {
      // Inversor
      if (input.serialInversor) {
        await prisma.activoInstalado.create({
          data: {
            obraId: input.obraId,
            tipo: 'INVERSOR',
            marca: (input.inversorReal || obra.inversor || '').split(' ')[0],
            modelo: input.inversorReal || obra.inversor || '',
            numeroSerie: input.serialInversor,
            
            garantiaHasta: new Date(Date.now() + 10 * 365.25 * 24 * 3600000),
          },
        });
      }

      // Batería
      if (input.serialBateria && (obra.bateriaKwh || 0) > 0) {
        await prisma.activoInstalado.create({
          data: {
            obraId: input.obraId,
            tipo: 'BATERIA',
            marca: (input.bateriaReal || '').split(' ')[0],
            modelo: input.bateriaReal || '',
            numeroSerie: input.serialBateria,
            
            garantiaHasta: new Date(Date.now() + 10 * 365.25 * 24 * 3600000),
          },
        });
      }
    }
  }

  // Auditoría
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'VALIDACION_AVANZADA',
      entidad: 'checklist',
      entidadId: checklist.id,
      detalle: JSON.stringify({
        resultado,
        criticos_fallidos: criticosFallidos.length,
        serial_inversor: input.serialInversor,
      }),
    },
  });

  logger.info('validacion_avanzada', { id: checklist.id, resultado });
  return { checklist, resultado, criticosFallidos: criticosFallidos.length };
}

// ── Listar validaciones ──
export async function listar() {
  return prisma.checklistValidacion.findMany({
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true } } } },
      creadoPor: { select: { nombre: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ── Detalle validación ──
export async function detalle(id: string) {
  return prisma.checklistValidacion.findUnique({
    where: { id },
    include: {
      items: true,
      obra: { select: { codigo: true, tipo: true, cliente: { select: { nombre: true, apellidos: true } } } },
      creadoPor: { select: { nombre: true } },
    },
  });
}

// ── OCR placeholder (Fase A: manual, Fase B: Tesseract) ──
export async function extraerSerialOCR(imageBase64: string): Promise<string | null> {
  // TODO Fase B: Integrar Tesseract.js o API OCR
  // Por ahora retorna null → el instalador introduce serial manualmente
  try {
    // Placeholder: intentar extraer con patrón regex básico si se implementa
    return null;
  } catch {
    return null;
  }
}

FILEEOF

echo '  → src/services/clientes.service.ts'
cat > 'src/services/clientes.service.ts' << 'FILEEOF'
// src/services/clientes.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function listar(filtros?: { q?: string }) {
  const q = filtros?.q;
  return prisma.cliente.findMany({
    where: {
      deletedAt: null,
      ...(q ? {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' as const } },
          { apellidos: { contains: q, mode: 'insensitive' as const } },
          { dniCif: { contains: q, mode: 'insensitive' as const } },
          { telefono: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { obras: true } },
    },
    orderBy: { nombre: 'asc' },
    take: 200,
  });
}

export async function detalle(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      obras: {
        where: { deletedAt: null },
        select: {
          id: true, codigo: true, estado: true, tipo: true,
          presupuestoTotal: true, localidad: true, createdAt: true,
          pagos: { select: { importe: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      leads: {
        select: { id: true, estado: true, importeEstimado: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function crear(input: {
  nombre: string; apellidos?: string; dniCif?: string;
  telefono?: string; email?: string; direccion?: string;
  codigoPostal?: string; localidad?: string; provincia?: string; notas?: string;
}) {
  const cliente = await prisma.cliente.create({ data: input as any });
  logger.info('cliente_creado', { id: cliente.id, nombre: input.nombre });
  return cliente;
}

export async function actualizar(id: string, input: {
  nombre?: string; apellidos?: string; dniCif?: string;
  telefono?: string; email?: string; direccion?: string;
  codigoPostal?: string; localidad?: string; provincia?: string; notas?: string;
}) {
  return prisma.cliente.update({ where: { id }, data: input });
}

export async function resumen() {
  const [total, conObra, sinObra] = await Promise.all([
    prisma.cliente.count({ where: { deletedAt: null } }),
    prisma.cliente.count({ where: { deletedAt: null, obras: { some: {} } } }),
    prisma.cliente.count({ where: { deletedAt: null, obras: { none: {} } } }),
  ]);
  return { total, conObra, sinObra };
}

FILEEOF

echo '  → src/app/\(dashboard\)/clientes/page.tsx'
cat > 'src/app/\(dashboard\)/clientes/page.tsx' << 'FILEEOF'
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
  const totalPresupuestado = cliente.obras.reduce((s, o) => s + (o.presupuestoTotal || 0), 0);
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
                  const pct = o.presupuestoTotal ? Math.round((cobrado / o.presupuestoTotal) * 100) : 0;
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
                        <div className="text-xs font-bold">{fmtMoney(o.presupuestoTotal)}</div>
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

FILEEOF

echo '  → src/app/\(dashboard\)/obras/page.tsx'
cat > 'src/app/\(dashboard\)/obras/page.tsx' << 'FILEEOF'
// src/app/(dashboard)/obras/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ObraCard } from '@/components/obras/ObraCard';
import { ObraDetalle } from '@/components/obras/ObraDetalle';
import { FiltrosObras } from '@/components/obras/FiltrosObras';
import { NuevaObraModal } from '@/components/obras/NuevaObraModal';

interface Obra {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  presupuestoTotal: number;
  cobrado: number;
  porcentajeCobro: number;
  potenciaKwp: number | null;
  localidad: string | null;
  fechaProgramada: string | null;
  cliente: { id: string; nombre: string; apellidos: string; telefono: string | null };
  comercial: { nombre: string; apellidos: string } | null;
  instaladores: Array<{ instalador: { nombre: string; apellidos: string } }>;
  _count: { incidencias: number };
}

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  REVISION_TECNICA: { label: 'Revisión', color: 'text-estado-purple', bg: 'bg-estado-purple/10', dot: 'bg-estado-purple' },
  PREPARANDO: { label: 'Preparando', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PENDIENTE_MATERIAL: { label: 'Pte. Material', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PROGRAMADA: { label: 'Programada', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  INSTALANDO: { label: 'Instalando', color: 'text-auro-orange', bg: 'bg-auro-orange/10', dot: 'bg-auro-orange animate-pulse' },
  TERMINADA: { label: 'Terminada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  INCIDENCIA: { label: 'Incidencia', color: 'text-estado-red', bg: 'bg-estado-red/10', dot: 'bg-estado-red animate-pulse' },
  LEGALIZACION: { label: 'Legalización', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  LEGALIZADA: { label: 'Legalizada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  COMPLETADA: { label: 'Completada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  CANCELADA: { label: 'Cancelada', color: 'text-auro-navy/40', bg: 'bg-auro-navy/5', dot: 'bg-auro-navy/30' },
};

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [obraSeleccionada, setObraSeleccionada] = useState<string | null>(null);
  const [mostrarNueva, setMostrarNueva] = useState(false);

  const cargarObras = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (busqueda) params.set('q', busqueda);

    try {
      const res = await fetch(`/api/obras?${params}`);
      const data = await res.json();
      if (data.ok) {
        setObras(data.data.obras);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Error cargando obras:', error);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, busqueda]);

  useEffect(() => {
    cargarObras();
  }, [cargarObras]);

  // Contadores por estado
  const contadores = obras.reduce((acc, obra) => {
    acc[obra.estado] = (acc[obra.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-auro-navy">Obras</h2>
          <p className="text-sm text-auro-navy/40 mt-0.5">
            {total} obra{total !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <button
          onClick={() => setMostrarNueva(true)}
          className="h-10 px-5 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors shadow-sm shadow-auro-orange/20 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Nueva obra
        </button>
      </div>

      {/* Contadores por estado */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setFiltroEstado('')}
          className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors
            ${!filtroEstado
              ? 'bg-auro-navy text-white border-auro-navy'
              : 'bg-white text-auro-navy/50 border-auro-border hover:border-auro-navy/20'
            }`}
        >
          Todas · {total}
        </button>
        {Object.entries(ESTADOS_CONFIG).map(([key, config]) => {
          const count = contadores[key] || 0;
          if (count === 0 && !filtroEstado) return null;
          return (
            <button
              key={key}
              onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5
                ${filtroEstado === key
                  ? `${config.bg} ${config.color} border-current/20`
                  : 'bg-white text-auro-navy/50 border-auro-border hover:border-auro-navy/20'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label} · {count}
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-auro-navy/30">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o cliente..."
            className="w-full sm:w-80 h-10 pl-9 pr-4 bg-white border border-auro-border rounded-input text-sm placeholder-auro-navy/30 focus:outline-none focus:border-auro-orange/40 transition-colors"
          />
        </div>
      </div>

      {/* Tabla de obras (escritorio) */}
      {loading ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-auro-navy/40 font-medium">Cargando obras...</p>
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-auro-navy/50 font-medium">No se encontraron obras</p>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="text-xs text-auro-orange font-semibold mt-2 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vista tabla (escritorio) */}
          <div className="hidden lg:block bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-auro-surface-2">
                  {['Código', 'Cliente', 'Localidad', 'Tipo', 'Estado', 'Total', 'Cobro'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => {
                  const estadoCfg = ESTADOS_CONFIG[obra.estado] || ESTADOS_CONFIG.REVISION_TECNICA;
                  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });
                  return (
                    <tr
                      key={obra.id}
                      onClick={() => setObraSeleccionada(obra.id)}
                      className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-bold text-auro-orange tabular-nums">
                          {obra.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-auro-navy truncate max-w-[180px]">
                          {obra.cliente.nombre} {obra.cliente.apellidos}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-auro-navy/50">
                        {obra.localidad || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-auro-navy/50 font-medium">
                        {obra.tipo === 'RESIDENCIAL' ? '🏠' : obra.tipo === 'INDUSTRIAL' ? '🏭' : '🌾'}{' '}
                        {obra.tipo.charAt(0) + obra.tipo.slice(1).toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-badge ${estadoCfg.bg} ${estadoCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                          {estadoCfg.label}
                        </span>
                        {obra._count.incidencias > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-estado-red bg-estado-red/10 px-1.5 py-0.5 rounded-full">
                            {obra._count.incidencias}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-auro-navy text-right tabular-nums">
                        {euros}€
                      </td>
                      <td className="px-4 py-3 w-28">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                obra.porcentajeCobro >= 100
                                  ? 'bg-estado-green'
                                  : obra.porcentajeCobro >= 50
                                  ? 'bg-auro-orange'
                                  : 'bg-estado-red'
                              }`}
                              style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-auro-navy/40 tabular-nums w-8 text-right">
                            {obra.porcentajeCobro}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista cards (móvil) */}
          <div className="lg:hidden space-y-3">
            {obras.map((obra) => (
              <ObraCard
                key={obra.id}
                obra={obra}
                onClick={() => setObraSeleccionada(obra.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal detalle de obra */}
      {obraSeleccionada && (
        <ObraDetalle
          obraId={obraSeleccionada}
          onClose={() => setObraSeleccionada(null)}
          onUpdate={cargarObras}
        />
      )}

      {/* Modal nueva obra */}
      {mostrarNueva && (
        <NuevaObraModal
          onClose={() => setMostrarNueva(false)}
          onCreated={() => {
            setMostrarNueva(false);
            cargarObras();
          }}
        />
      )}
    </div>
  );
}

FILEEOF

echo '  → src/components/obras/ObraCard.tsx'
cat > 'src/components/obras/ObraCard.tsx' << 'FILEEOF'
// src/components/obras/ObraCard.tsx
'use client';

import { ESTADOS_CONFIG } from '@/lib/constants';

interface Props {
  obra: {
    id: string;
    codigo: string;
    tipo: string;
    estado: string;
    presupuestoTotal: number;
    porcentajeCobro: number;
    potenciaKwp: number | null;
    localidad: string | null;
    cliente: { nombre: string; apellidos: string };
    _count: { incidencias: number };
  };
  onClick: () => void;
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠',
  INDUSTRIAL: '🏭',
  AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋',
  AEROTERMIA: '🌡️',
  BESS: '⚡',
  BACKUP: '🔌',
};

export function ObraCard({ obra, onClick }: Props) {
  const estadoCfg = ESTADOS_CONFIG[obra.estado] || ESTADOS_CONFIG.REVISION_TECNICA;
  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });

  return (
    <div
      onClick={onClick}
      className="bg-white border border-auro-border rounded-card p-4 shadow-sm active:bg-auro-surface-2 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TIPO_ICONS[obra.tipo] || '⚡'}</span>
          <div>
            <div className="text-[12px] font-bold text-auro-orange">{obra.codigo}</div>
            <div className="text-sm font-bold text-auro-navy">
              {obra.cliente.nombre} {obra.cliente.apellidos}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-badge ${estadoCfg.bg} ${estadoCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
          {estadoCfg.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-auro-navy/40 mb-3">
        {obra.localidad && <span>📍 {obra.localidad}</span>}
        {obra.potenciaKwp && <span>⚡ {obra.potenciaKwp} kWp</span>}
        {obra._count.incidencias > 0 && (
          <span className="text-estado-red font-bold">⚠️ {obra._count.incidencias}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-auro-navy">{euros}€</span>
        <div className="flex items-center gap-2 w-24">
          <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                obra.porcentajeCobro >= 100 ? 'bg-estado-green' : obra.porcentajeCobro >= 50 ? 'bg-auro-orange' : 'bg-estado-red'
              }`}
              style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-auro-navy/40 tabular-nums">
            {obra.porcentajeCobro}%
          </span>
        </div>
      </div>
    </div>
  );
}

FILEEOF


# Remove old broken route
rm -rf src/app/api/crm-dashboard 2>/dev/null

# Fix permissions
chown -R deploy:deploy src/ prisma/ 2>/dev/null || true

echo ""
echo "✅ Archivos creados. Ahora ejecuta:"
echo "   npx prisma db push && npm run build && pm2 restart aurosolar-erp"
