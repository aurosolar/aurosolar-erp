// src/app/(dashboard)/auditoria/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Evento {
  id: string; accion: string; entidad: string; entidadId: string | null;
  detalle: string | null; createdAt: string;
  usuario: { nombre: string; apellidos: string | null; rol: string };
  obra: { codigo: string } | null;
}

interface Resumen {
  totalHoy: number; totalSemana: number; totalGlobal: number;
  porEntidad: Array<{ entidad: string; count: number }>;
  porUsuario: Array<{ usuario: string; count: number }>;
  entidades: string[];
  acciones: string[];
}

const ICONOS_ACCION: Record<string, string> = {
  ESTADO_CAMBIADO: '🔄', PAGO_REGISTRADO: '💰', DOCUMENTO_SUBIDO: '📤',
  INCIDENCIA_CREADA: '⚠️', INCIDENCIA_RESUELTA: '✅', MATERIAL_SOLICITADO: '📦',
  MATERIAL_APROBADO: '✓', OBRA_CREADA: '🏗️', LEAD_CREADO: '📊',
  LEAD_CONVERTIDO: '🎯', CHECKIN: '📍', CHECKOUT: '🏁',
  VALIDACION_COMPLETADA: '✅', LEGALIZACION_ACTUALIZADA: '📋',
  ACTIVO_CREADO: '🔋', MANTENIMIENTO_PROGRAMADO: '🔧',
};

const ICONOS_ENTIDAD: Record<string, string> = {
  obra: '🏗️', pago: '💰', incidencia: '⚠️', documento: '📤',
  material: '📦', lead: '📊', checkin: '📍', validacion: '✅',
  legalizacion: '📋', activo: '🔋', mantenimiento: '🔧', catalogo: '⚙️',
};

function tiempoRelativo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(fecha).toLocaleDateString('es-ES');
}

function parseDetalle(det: string | null): Record<string, any> | null {
  if (!det) return null;
  try { return JSON.parse(det); } catch { return null; }
}

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [detalle, setDetalle] = useState<Evento | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEntidad) params.set('entidad', filtroEntidad);
    if (filtroDesde) params.set('desde', filtroDesde);
    if (filtroHasta) params.set('hasta', filtroHasta);
    params.set('limit', '200');

    const [rEventos, rResumen] = await Promise.all([
      fetch(`/api/auditoria?${params}`).then(r => r.json()),
      fetch('/api/auditoria/resumen').then(r => r.json()),
    ]);
    if (rEventos.ok) setEventos(rEventos.data);
    if (rResumen.ok) setResumen(rResumen.data);
    setLoading(false);
  }, [filtroEntidad, filtroDesde, filtroHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar por fecha
  const grupos: Record<string, Evento[]> = {};
  eventos.forEach(e => {
    const dia = new Date(e.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    (grupos[dia] ||= []).push(e);
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Auditoría del sistema</h2>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">📌</div>
            <div className="text-2xl font-extrabold text-auro-navy">{resumen.totalHoy}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Hoy</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">📅</div>
            <div className="text-2xl font-extrabold text-estado-blue">{resumen.totalSemana}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Esta semana</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">📊</div>
            <div className="text-2xl font-extrabold text-auro-navy/50">{resumen.totalGlobal}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total</div>
          </div>
        </div>
      )}

      {/* Actividad por entidad + usuario */}
      {resumen && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">Por módulo (7 días)</div>
            <div className="space-y-1">
              {resumen.porEntidad.map(e => (
                <div key={e.entidad} className="flex items-center justify-between text-xs">
                  <span>{ICONOS_ENTIDAD[e.entidad] || '📋'} {e.entidad}</span>
                  <span className="font-bold text-auro-navy/50">{e.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase mb-2">Top usuarios (7 días)</div>
            <div className="space-y-1">
              {resumen.porUsuario.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate">{u.usuario}</span>
                  <span className="font-bold text-auro-navy/50">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filtroEntidad} onChange={e => setFiltroEntidad(e.target.value)}
          className="h-9 px-3 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40">
          <option value="">Todas las entidades</option>
          {resumen?.entidades.map(e => <option key={e} value={e}>{ICONOS_ENTIDAD[e] || '📋'} {e}</option>)}
        </select>
        <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
          className="h-9 px-3 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40" />
        <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
          className="h-9 px-3 bg-white border border-auro-border rounded-lg text-xs focus:outline-none focus:border-auro-orange/40" />
        {(filtroEntidad || filtroDesde || filtroHasta) && (
          <button onClick={() => { setFiltroEntidad(''); setFiltroDesde(''); setFiltroHasta(''); }}
            className="h-9 px-3 text-xs text-auro-navy/30 hover:text-auro-navy/60">✕ Limpiar</button>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">Sin eventos registrados</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grupos).map(([dia, evs]) => (
            <div key={dia}>
              <div className="text-[10px] font-bold text-auro-navy/25 uppercase mb-2 sticky top-0 bg-auro-surface py-1">{dia}</div>
              <div className="relative pl-6 border-l-2 border-auro-border space-y-0.5">
                {evs.map(ev => {
                  const det = parseDetalle(ev.detalle);
                  return (
                    <button key={ev.id} onClick={() => setDetalle(ev)}
                      className="w-full text-left relative py-2 hover:bg-auro-orange/5 rounded-r-lg px-3 transition-colors group">
                      {/* Dot */}
                      <div className="absolute -left-[29px] top-3 w-3.5 h-3.5 rounded-full bg-white border-2 border-auro-orange flex items-center justify-center text-[8px]">
                        {ICONOS_ACCION[ev.accion]?.[0] || '•'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{ICONOS_ACCION[ev.accion] || ICONOS_ENTIDAD[ev.entidad] || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {ev.accion.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                          </div>
                          <div className="text-[10px] text-auro-navy/30 truncate">
                            {ev.usuario.nombre} {ev.usuario.apellidos || ''}
                            {ev.obra && <span> · {ev.obra.codigo}</span>}
                            {det?.estado_nuevo && <span> → {det.estado_nuevo}</span>}
                          </div>
                        </div>
                        <span className="text-[9px] text-auro-navy/20 shrink-0">{tiempoRelativo(ev.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-auro-orange/10 flex items-center justify-center text-lg">
                  {ICONOS_ACCION[detalle.accion] || '📋'}
                </div>
                <div>
                  <div className="text-sm font-bold">{detalle.accion.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-auro-navy/30">
                    {new Date(detalle.createdAt).toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-auro-surface-2 rounded-lg px-3 py-2">
                  <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">👤 Usuario</div>
                  <div className="font-medium mt-0.5">{detalle.usuario.nombre} {detalle.usuario.apellidos || ''}</div>
                  <div className="text-[9px] text-auro-navy/25">{detalle.usuario.rol}</div>
                </div>
                <div className="bg-auro-surface-2 rounded-lg px-3 py-2">
                  <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">📋 Entidad</div>
                  <div className="font-medium mt-0.5">{detalle.entidad}</div>
                  {detalle.entidadId && <div className="text-[9px] text-auro-navy/25 truncate">{detalle.entidadId}</div>}
                </div>
                {detalle.obra && (
                  <div className="bg-auro-surface-2 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[9px] text-auro-navy/25 uppercase font-semibold">🏗️ Obra</div>
                    <div className="font-medium mt-0.5">{detalle.obra.codigo}</div>
                  </div>
                )}
              </div>

              {detalle.detalle && (() => {
                const det = parseDetalle(detalle.detalle);
                if (!det) return <pre className="text-[10px] text-auro-navy/40 bg-auro-surface-2 rounded-lg p-3 overflow-x-auto">{detalle.detalle}</pre>;
                return (
                  <div className="bg-auro-surface-2 rounded-lg p-3">
                    <div className="text-[9px] text-auro-navy/25 uppercase font-semibold mb-1.5">📝 Detalles</div>
                    <div className="space-y-1">
                      {Object.entries(det).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-auro-navy/40">{k.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
