#!/usr/bin/env python3
"""
AUROSOLAR ERP - File Creator
Creates missing pages directly from Python to avoid shell escaping issues
Run: python3 create-missing-pages.py
"""
import os

BASE = '/var/www/erp/src/app/(dashboard)'

# ═══ CONTACTOS PAGE ═══
contactos_page = r"""// src/app/(dashboard)/contactos/page.tsx
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
  _count: { tareasCrm: number; notasCrm: number; archivosCrm: number };
}

const ESTADOS_CONTACTO: Record<string, { label: string; color: string; bg: string }> = {
  POSIBLE_CLIENTE: { label: 'Posible cliente', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  CUALIFICADO: { label: 'Cualificado', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  CLIENTE: { label: 'Cliente', color: 'text-green-400', bg: 'bg-green-500/15' },
  PERDIDO: { label: 'Perdido', color: 'text-red-400', bg: 'bg-red-500/15' },
  INACTIVO: { label: 'Inactivo', color: 'text-gray-400', bg: 'bg-gray-500/15' },
};

const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 })}\u20ac`;

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: '', apellidos: '', empresa: '', telefono: '', email: '',
    direccion: '', localidad: '', provincia: '', codigoPostal: '', origen: 'TELEFONO', tipoInteres: '',
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (busqueda) params.set('q', busqueda);
      const res = await fetch(`/api/contactos?${params}`);
      const data = await res.json();
      if (data.ok) setContactos(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filtroEstado, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crear() {
    if (!form.nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/contactos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMostrarNuevo(false);
        setForm({ nombre: '', apellidos: '', empresa: '', telefono: '', email: '', direccion: '', localidad: '', provincia: '', codigoPostal: '', origen: 'TELEFONO', tipoInteres: '' });
        cargar();
      }
    } catch (e) { console.error(e); }
    setGuardando(false);
  }

  const totalValor = contactos.reduce((s, c) => s + c.tratos.reduce((ts, t) => ts + (t.importe || 0), 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-auro-navy">Contactos</h1>
          <p className="text-xs text-gray-500">{contactos.length} contactos &middot; {fmt(totalValor)} en tratos</p>
        </div>
        <button onClick={() => setMostrarNuevo(true)} className="px-4 py-2 bg-auro-orange hover:bg-auro-orange-dark text-white rounded-button text-sm font-semibold transition-colors">+ Nuevo contacto</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input placeholder="Buscar nombre, tel\u00e9fono, email..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="h-9 px-3 bg-white border border-auro-border rounded-input text-sm text-auro-navy w-64 focus:outline-none focus:ring-2 focus:ring-auro-orange/30" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="h-9 px-3 bg-white border border-auro-border rounded-input text-sm text-auro-navy">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_CONTACTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Cargando contactos...</div>
      ) : contactos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{'\ud83d\udc64'}</div>
          <div className="text-gray-500 text-sm">Sin contactos</div>
          <p className="text-xs text-gray-400 mt-1">Crea tu primer contacto para empezar el pipeline comercial</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {contactos.map(c => {
            const ec = ESTADOS_CONTACTO[c.estado] || { label: c.estado, color: 'text-gray-400', bg: 'bg-gray-500/15' };
            const valorTratos = c.tratos.reduce((s, t) => s + (t.importe || 0), 0);
            const tratosActivos = c.tratos.filter(t => !['GANADO', 'PERDIDO'].includes(t.estado)).length;
            return (
              <Link key={c.id} href={`/contactos/${c.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-auro-border rounded-card hover:border-auro-orange/40 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-auro-navy/10 flex items-center justify-center text-sm font-bold text-auro-navy shrink-0">
                  {c.nombre[0]}{(c.apellidos || '')[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-auro-navy truncate">{c.nombre} {c.apellidos}</span>
                    <span className={`px-2 py-0.5 rounded-badge text-[10px] font-medium ${ec.color} ${ec.bg}`}>{ec.label}</span>
                  </div>
                  <div className="flex gap-3 text-[11px] text-gray-500 mt-0.5">
                    {c.telefono && <span>{'\ud83d\udcde'} {c.telefono}</span>}
                    {c.email && <span>{'\ud83d\udce7'} {c.email}</span>}
                    {c.localidad && <span>{'\ud83d\udccd'} {c.localidad}</span>}
                    {c.comercial && <span>{'\ud83d\udc64'} {c.comercial.nombre}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {tratosActivos > 0 && <div className="text-xs text-auro-orange font-semibold">{tratosActivos} trato{tratosActivos > 1 ? 's' : ''}</div>}
                  {valorTratos > 0 && <div className="text-[11px] text-gray-500">{fmt(valorTratos)}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {mostrarNuevo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMostrarNuevo(false)}>
          <div className="bg-white rounded-card p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-auro-navy mb-4">Nuevo contacto</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              <input placeholder="Apellidos" value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              <input placeholder="Tel\u00e9fono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              <select value={form.tipoInteres} onChange={e => setForm({...form, tipoInteres: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm">
                <option value="">Tipo de inter\u00e9s</option>
                <option value="RESIDENCIAL">Residencial</option>
                <option value="INDUSTRIAL">Industrial</option>
                <option value="BATERIA">Bater\u00eda</option>
                <option value="AEROTERMIA">Aerotermia</option>
                <option value="BESS">BESS</option>
                <option value="BACKUP">Backup</option>
              </select>
              <select value={form.origen} onChange={e => setForm({...form, origen: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm">
                <option value="TELEFONO">Tel\u00e9fono</option>
                <option value="WEB">Web</option>
                <option value="RECOMENDACION">Recomendaci\u00f3n</option>
                <option value="FERIA">Feria</option>
                <option value="PUERTA_FRIA">Puerta fr\u00eda</option>
                <option value="OTRO">Otro</option>
              </select>
              <input placeholder="Localidad" value={form.localidad} onChange={e => setForm({...form, localidad: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
              <input placeholder="Provincia" value={form.provincia} onChange={e => setForm({...form, provincia: e.target.value})}
                className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setMostrarNuevo(false)} className="flex-1 h-10 border border-auro-border rounded-button text-sm text-gray-600">Cancelar</button>
              <button onClick={crear} disabled={!form.nombre.trim() || guardando}
                className="flex-1 h-10 bg-auro-orange hover:bg-auro-orange-dark rounded-button text-sm text-white font-semibold disabled:opacity-40">
                {guardando ? 'Creando...' : 'Crear contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

# ═══ TAREAS CRM PAGE ═══
tareas_page = r"""// src/app/(dashboard)/tareas-crm/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tarea {
  id: string; tipo: string; titulo: string; descripcion: string | null;
  estado: string; prioridad: string; fechaVencimiento: string | null;
  contactoId: string;
  contacto: { id: string; nombre: string; apellidos: string };
  asignado: { id: string; nombre: string; apellidos: string } | null;
  createdAt: string;
}

const TIPOS: Record<string, string> = {
  LLAMADA: '\ud83d\udcde', EMAIL: '\ud83d\udce7', REUNION: '\ud83e\udd1d',
  VISITA: '\ud83c\udfe0', PRESUPUESTO: '\ud83d\udcc4', SEGUIMIENTO: '\ud83d\udd04',
};

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  EN_CURSO: { label: 'En curso', color: 'text-blue-600', bg: 'bg-blue-50' },
  COMPLETADA: { label: 'Completada', color: 'text-green-600', bg: 'bg-green-50' },
  CANCELADA: { label: 'Cancelada', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const PRIOS: Record<string, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: 'text-gray-500' },
  MEDIA: { label: 'Media', color: 'text-yellow-600' },
  ALTA: { label: 'Alta', color: 'text-orange-600' },
  URGENTE: { label: 'Urgente', color: 'text-red-600' },
};

export default function TareasCrmPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('PENDIENTE');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filtro) p.set('estado', filtro);
      const res = await fetch(`/api/tareas-crm?${p}`);
      const d = await res.json();
      if (d.ok) setTareas(d.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function completar(id: string) {
    await fetch(`/api/tareas-crm/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    });
    cargar();
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-auro-navy">Mis Tareas CRM</h1>
        <p className="text-xs text-gray-500">{tareas.length} tareas</p>
      </div>

      <div className="flex gap-2">
        {['', 'PENDIENTE', 'EN_CURSO', 'COMPLETADA'].map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded-badge text-xs font-medium transition-colors ${
              filtro === e ? 'bg-auro-orange text-white' : 'bg-white border border-auro-border text-gray-600 hover:bg-gray-50'
            }`}>
            {e === '' ? 'Todas' : ESTADOS[e]?.label || e}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Cargando tareas...</div>
      ) : tareas.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{'\u2705'}</div>
          <div className="text-gray-500 text-sm">Sin tareas pendientes</div>
          <p className="text-xs text-gray-400 mt-1">Las tareas se crean desde la ficha de contacto</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tareas.map(t => {
            const est = ESTADOS[t.estado] || { label: t.estado, color: 'text-gray-500', bg: 'bg-gray-100' };
            const prio = PRIOS[t.prioridad] || { label: t.prioridad, color: 'text-gray-500' };
            const vencida = t.fechaVencimiento && new Date(t.fechaVencimiento) < hoy && t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA';
            return (
              <div key={t.id} className={`flex items-center gap-3 p-3 bg-white border rounded-card transition-all ${
                vencida ? 'border-red-300 bg-red-50/30' : 'border-auro-border hover:border-auro-orange/30'
              }`}>
                {t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA' ? (
                  <button onClick={() => completar(t.id)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 shrink-0" title="Completar" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px]">{'\u2713'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{TIPOS[t.tipo] || '\ud83d\udccb'}</span>
                    <span className={`text-sm font-semibold ${t.estado === 'COMPLETADA' ? 'text-gray-400 line-through' : 'text-auro-navy'}`}>{t.titulo}</span>
                    <span className={`px-1.5 py-0.5 rounded-badge text-[9px] font-medium ${prio.color} bg-gray-100`}>{prio.label}</span>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[11px] text-gray-500">
                    <Link href={`/contactos/${t.contactoId}`} className="hover:text-auro-orange">
                      {t.contacto.nombre} {t.contacto.apellidos}
                    </Link>
                    {t.fechaVencimiento && (
                      <span className={vencida ? 'text-red-500 font-medium' : ''}>
                        {new Date(t.fechaVencimiento).toLocaleDateString('es-ES')}
                        {vencida ? ' \u26a0\ufe0f Vencida' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-badge text-[10px] font-medium ${est.color} ${est.bg}`}>{est.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"""

# ═══ WRITE FILES ═══
def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'  \u2713 Created {path}')

print('Creating missing pages...')
write_file(f'{BASE}/contactos/page.tsx', contactos_page)
write_file(f'{BASE}/tareas-crm/page.tsx', tareas_page)
print('Done!')
