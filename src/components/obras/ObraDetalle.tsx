// src/components/obras/ObraDetalle.tsx
'use client';

import { useState, useEffect } from 'react';

interface ObraDetalleData {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  presupuestoTotal: number;
  totalCobrado: number;
  totalGastos: number;
  pendiente: number;
  porcentajeCobro: number;
  margen: number;
  potenciaKwp: number | null;
  numPaneles: number | null;
  inversor: string | null;
  localidad: string | null;
  provincia: string | null;
  direccionInstalacion: string | null;
  notas: string | null;
  fechaProgramada: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  cliente: { nombre: string; apellidos: string; telefono: string | null; email: string | null };
  comercial: { nombre: string; apellidos: string } | null;
  instaladores: Array<{ instalador: { nombre: string; apellidos: string }; esJefe: boolean }>;
  actividades: Array<{ accion: string; detalle: string | null; createdAt: string; usuario: { nombre: string } }>;
  incidencias: Array<{ id: string; gravedad: string; estado: string; descripcion: string; createdAt: string }>;
}

// Transiciones válidas
const TRANSICIONES: Record<string, string[]> = {
  REVISION_TECNICA: ['PREPARANDO', 'CANCELADA'],
  PREPARANDO: ['PENDIENTE_MATERIAL', 'PROGRAMADA', 'CANCELADA'],
  PENDIENTE_MATERIAL: ['PREPARANDO', 'PROGRAMADA', 'CANCELADA'],
  PROGRAMADA: ['INSTALANDO', 'PREPARANDO', 'CANCELADA'],
  INSTALANDO: ['TERMINADA', 'INCIDENCIA'],
  TERMINADA: ['LEGALIZACION', 'INCIDENCIA'],
  INCIDENCIA: ['INSTALANDO', 'TERMINADA', 'PROGRAMADA'],
  LEGALIZACION: ['LEGALIZADA', 'INCIDENCIA'],
  LEGALIZADA: ['COMPLETADA'],
  COMPLETADA: [],
  CANCELADA: ['REVISION_TECNICA'],
};

const ESTADO_LABELS: Record<string, string> = {
  REVISION_TECNICA: '🔍 Revisión técnica',
  PREPARANDO: '📋 Preparando',
  PENDIENTE_MATERIAL: '📦 Pte. Material',
  PROGRAMADA: '📅 Programada',
  INSTALANDO: '⚡ Instalando',
  TERMINADA: '✅ Terminada',
  INCIDENCIA: '⚠️ Incidencia',
  LEGALIZACION: '📋 Legalización',
  LEGALIZADA: '✅ Legalizada',
  COMPLETADA: '🏆 Completada',
  CANCELADA: '❌ Cancelada',
};

interface Props {
  obraId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ObraDetalle({ obraId, onClose, onUpdate }: Props) {
  const [obra, setObra] = useState<ObraDetalleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [notaCambio, setNotaCambio] = useState('');
  const [tab, setTab] = useState<'info' | 'timeline' | 'incidencias'>('info');

  useEffect(() => {
    fetchObra();
  }, [obraId]);

  async function fetchObra() {
    setLoading(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`);
      const data = await res.json();
      if (data.ok) setObra(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(nuevoEstado: string) {
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, nota: notaCambio || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotaCambio('');
        fetchObra();
        onUpdate();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error al cambiar estado');
    } finally {
      setCambiandoEstado(false);
    }
  }

  const formatEuros = (centimos: number) =>
    (centimos / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 }) + '€';

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 lg:pt-16 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10" onClick={(e) => e.stopPropagation()}>
        {loading || !obra ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 border-b border-auro-border flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-auro-orange mb-0.5">{obra.codigo}</div>
                <h3 className="text-lg font-bold text-auro-navy">
                  {obra.cliente.nombre} {obra.cliente.apellidos}
                </h3>
                {obra.direccionInstalacion && (
                  <p className="text-xs text-auro-navy/40 mt-0.5">📍 {obra.direccionInstalacion}, {obra.localidad}</p>
                )}
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-auro-surface-2 hover:bg-auro-surface-3 flex items-center justify-center text-lg transition-colors">
                ✕
              </button>
            </div>

            {/* Estado actual + cambiar */}
            <div className="p-5 bg-auro-surface-2/50 border-b border-auro-border">
              <div className="text-xs font-semibold text-auro-navy/40 uppercase tracking-wider mb-2">Estado actual</div>
              <div className="text-lg font-bold text-auro-navy mb-3">
                {ESTADO_LABELS[obra.estado] || obra.estado}
              </div>

              {TRANSICIONES[obra.estado]?.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-auro-navy/40 mb-2">Cambiar a:</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {TRANSICIONES[obra.estado].map((est) => (
                      <button
                        key={est}
                        onClick={() => cambiarEstado(est)}
                        disabled={cambiandoEstado}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-white border border-auro-border hover:border-auro-orange hover:text-auro-orange transition-colors disabled:opacity-50"
                      >
                        {ESTADO_LABELS[est] || est}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={notaCambio}
                    onChange={(e) => setNotaCambio(e.target.value)}
                    placeholder="Nota del cambio (opcional)..."
                    className="w-full h-8 px-3 text-xs bg-white border border-auro-border rounded-lg placeholder-auro-navy/25 focus:outline-none focus:border-auro-orange/40"
                  />
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-auro-border">
              {(['info', 'timeline', 'incidencias'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center transition-colors border-b-2
                    ${tab === t ? 'text-auro-orange border-auro-orange' : 'text-auro-navy/30 border-transparent hover:text-auro-navy/50'}`}
                >
                  {t === 'info' ? '📋 Info' : t === 'timeline' ? '📝 Actividad' : `⚠️ Incidencias (${obra.incidencias.length})`}
                </button>
              ))}
            </div>

            {/* Contenido tab */}
            <div className="p-5 max-h-[400px] overflow-y-auto">
              {tab === 'info' && (
                <div className="space-y-4">
                  {/* KPIs económicos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Presupuesto', value: formatEuros(obra.presupuestoTotal), color: 'text-auro-navy' },
                      { label: 'Cobrado', value: formatEuros(obra.totalCobrado), color: 'text-estado-green' },
                      { label: 'Pendiente', value: formatEuros(obra.pendiente), color: obra.pendiente > 0 ? 'text-estado-red' : 'text-estado-green' },
                      { label: 'Margen', value: `${obra.margen}%`, color: obra.margen >= 25 ? 'text-estado-green' : 'text-estado-amber' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-auro-surface-2 rounded-xl p-3">
                        <div className="text-[10px] font-semibold text-auro-navy/30 uppercase">{kpi.label}</div>
                        <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Datos técnicos */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Datos técnicos</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div><span className="text-auro-navy/40">Tipo:</span> <span className="font-medium">{obra.tipo}</span></div>
                      <div><span className="text-auro-navy/40">Potencia:</span> <span className="font-medium">{obra.potenciaKwp || '—'} kWp</span></div>
                      <div><span className="text-auro-navy/40">Paneles:</span> <span className="font-medium">{obra.numPaneles || '—'}</span></div>
                      <div><span className="text-auro-navy/40">Inversor:</span> <span className="font-medium">{obra.inversor || '—'}</span></div>
                    </div>
                  </div>

                  {/* Equipo */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Equipo</div>
                    <div className="text-sm space-y-1">
                      {obra.comercial && (
                        <div><span className="text-auro-navy/40">Comercial:</span> <span className="font-medium">{obra.comercial.nombre} {obra.comercial.apellidos}</span></div>
                      )}
                      {obra.instaladores.map((inst, i) => (
                        <div key={i}><span className="text-auro-navy/40">{inst.esJefe ? 'Jefe inst.:' : 'Instalador:'}</span> <span className="font-medium">{inst.instalador.nombre} {inst.instalador.apellidos}</span></div>
                      ))}
                    </div>
                  </div>

                  {/* Cliente */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Cliente</div>
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{obra.cliente.nombre} {obra.cliente.apellidos}</div>
                      {obra.cliente.telefono && <div className="text-auro-navy/50">📞 {obra.cliente.telefono}</div>}
                      {obra.cliente.email && <div className="text-auro-navy/50">✉️ {obra.cliente.email}</div>}
                    </div>
                  </div>

                  {obra.notas && (
                    <div>
                      <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Notas</div>
                      <p className="text-sm text-auro-navy/60">{obra.notas}</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'timeline' && (
                <div className="space-y-3">
                  {obra.actividades.length === 0 ? (
                    <p className="text-sm text-auro-navy/30 text-center py-6">Sin actividad registrada</p>
                  ) : (
                    obra.actividades.map((act, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-auro-surface-2 flex items-center justify-center text-xs shrink-0">
                          {act.accion.includes('ESTADO') ? '🔄' : act.accion.includes('PAGO') ? '💰' : act.accion.includes('CREADA') ? '✨' : '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-auro-navy">{act.accion.replace(/_/g, ' ')}</div>
                          {act.detalle && (
                            <p className="text-xs text-auro-navy/40 mt-0.5 truncate">{act.detalle}</p>
                          )}
                          <div className="text-[10px] text-auro-navy/25 mt-0.5">
                            {act.usuario.nombre} · {formatFechaHora(act.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'incidencias' && (
                <div className="space-y-3">
                  {obra.incidencias.length === 0 ? (
                    <p className="text-sm text-auro-navy/30 text-center py-6">Sin incidencias 🎉</p>
                  ) : (
                    obra.incidencias.map((inc) => (
                      <div key={inc.id} className="bg-auro-surface-2 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${
                            inc.gravedad === 'CRITICA' || inc.gravedad === 'ALTA' ? 'text-estado-red' :
                            inc.gravedad === 'MEDIA' ? 'text-estado-amber' : 'text-estado-blue'
                          }`}>
                            {inc.gravedad === 'CRITICA' ? '🔴' : inc.gravedad === 'ALTA' ? '🔴' : inc.gravedad === 'MEDIA' ? '🟡' : '🔵'} {inc.gravedad}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            inc.estado === 'ABIERTA' ? 'bg-estado-red/10 text-estado-red' :
                            inc.estado === 'EN_PROCESO' ? 'bg-estado-amber/10 text-estado-amber' :
                            'bg-estado-green/10 text-estado-green'
                          }`}>
                            {inc.estado}
                          </span>
                        </div>
                        <p className="text-sm text-auro-navy/70">{inc.descripcion}</p>
                        <div className="text-[10px] text-auro-navy/25 mt-1">{formatFecha(inc.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
