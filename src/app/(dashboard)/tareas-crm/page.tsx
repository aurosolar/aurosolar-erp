// src/app/(dashboard)/tareas-crm/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tarea {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  fechaVencimiento: string | null;
  contactoId: string;
  contacto: { id: string; nombre: string; apellidos: string };
  asignado: { id: string; nombre: string; apellidos: string } | null;
  createdAt: string;
}

const TIPOS: Record<string, string> = {
  LLAMADA: '📞', EMAIL: '📧', REUNION: '🤝',
  VISITA: '🏠', PRESUPUESTO: '📄', SEGUIMIENTO: '🔄',
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    });
    cargar();
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

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
          <div className="text-4xl mb-3">✅</div>
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
                    className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 shrink-0 transition-colors" title="Completar" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px]">✓</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{TIPOS[t.tipo] || '📋'}</span>
                    <span className={`text-sm font-semibold ${t.estado === 'COMPLETADA' ? 'text-gray-400 line-through' : 'text-auro-navy'}`}>{t.titulo}</span>
                    <span className={`px-1.5 py-0.5 rounded-badge text-[9px] font-medium ${prio.color} bg-gray-100`}>{prio.label}</span>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[11px] text-gray-500">
                    <Link href={`/contactos/${t.contactoId}`} className="hover:text-auro-orange">
                      👤 {t.contacto.nombre} {t.contacto.apellidos}
                    </Link>
                    {t.fechaVencimiento && (
                      <span className={vencida ? 'text-red-500 font-medium' : ''}>
                        📅 {new Date(t.fechaVencimiento).toLocaleDateString('es-ES')}
                        {vencida ? ' ⚠️ Vencida' : ''}
                      </span>
                    )}
                    {t.asignado && <span>→ {t.asignado.nombre}</span>}
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
