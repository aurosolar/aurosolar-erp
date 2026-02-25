// src/components/obras/ObraDetalle.tsx
// Sprint 1: Nuevo flujo de estados, tabs completas, asignación instaladores
'use client';

import { useState, useEffect } from 'react';

interface ObraDetalleData {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  tieneIncidenciaCritica: boolean;
  presupuestoTotal: number;
  totalCobrado: number;
  totalGastos: number;
  pendiente: number;
  porcentajeCobro: number;
  margen: number;
  potenciaKwp: number | null;
  numPaneles: number | null;
  inversor: string | null;
  bateriaKwh: number | null;
  localidad: string | null;
  provincia: string | null;
  direccionInstalacion: string | null;
  notas: string | null;
  fechaCreacion: string;
  fechaProgramada: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaValidacion: string | null;
  transicionesDisponibles: string[];
  incidenciasAbiertas: number;
  cliente: { nombre: string; apellidos: string; telefono: string | null; email: string | null; direccion: string | null };
  comercial: { id: string; nombre: string; apellidos: string } | null;
  instaladores: Array<{ instalador: { id: string; nombre: string; apellidos: string }; esJefe: boolean }>;
  planPagos: Array<{ id: string; concepto: string; importe: number; pagado: boolean; fechaPrevista: string | null }>;
  pagos: Array<{ id: string; importe: number; metodo: string; fechaCobro: string; concepto: string | null; registradoPor: { nombre: string } }>;
  actividades: Array<{ accion: string; detalle: string | null; createdAt: string; usuario: { nombre: string } }>;
  incidencias: Array<{ id: string; gravedad: string; estado: string; descripcion: string; categoria: string | null; createdAt: string }>;
  documentos: Array<{ id: string; tipo: string; nombre: string; createdAt: string }>;
  gastos: Array<{ id: string; tipo: string; importe: number; descripcion: string | null; estado: string; createdAt: string }>;
}

const ESTADO_CONFIG: Record<string, { label: string; icon: string; bgClass: string; textClass: string }> = {
  REVISION_TECNICA:      { label: 'Revisión técnica',     icon: '🔍', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  PREPARANDO:            { label: 'Preparando',           icon: '📋', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',        icon: '📦', bgClass: 'bg-estado-amber/10',  textClass: 'text-estado-amber' },
  PROGRAMADA:            { label: 'Programada',           icon: '📅', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  INSTALANDO:            { label: 'Instalando',           icon: '⚡', bgClass: 'bg-estado-amber/10',  textClass: 'text-estado-amber' },
  VALIDACION_OPERATIVA:  { label: 'Validación operativa', icon: '✅', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  REVISION_COORDINADOR:  { label: 'Revisión coordinador', icon: '👷', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  TERMINADA:             { label: 'Terminada',            icon: '✅', bgClass: 'bg-estado-green/10',  textClass: 'text-estado-green' },
  LEGALIZACION:          { label: 'Legalización',         icon: '📋', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  LEGALIZADA:            { label: 'Legalizada',           icon: '✅', bgClass: 'bg-estado-green/10',  textClass: 'text-estado-green' },
  COMPLETADA:            { label: 'Completada',           icon: '🏆', bgClass: 'bg-estado-green/10',  textClass: 'text-estado-green' },
  CANCELADA:             { label: 'Cancelada',            icon: '❌', bgClass: 'bg-estado-red/10',    textClass: 'text-estado-red' },
};

type TabId = 'info' | 'pagos' | 'documentos' | 'timeline' | 'incidencias';

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
  const [errorCambio, setErrorCambio] = useState('');
  const [tab, setTab] = useState<TabId>('info');

  useEffect(() => { fetchObra(); }, [obraId]);

  async function fetchObra() {
    setLoading(true);
    try {
      const res = await fetch(`/api/obras/${obraId}`);
      const data = await res.json();
      if (data.ok) setObra(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function cambiarEstado(nuevoEstado: string, override = false) {
    setCambiandoEstado(true);
    setErrorCambio('');
    try {
      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, nota: notaCambio || undefined, override }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotaCambio('');
        fetchObra();
        onUpdate();
      } else {
        setErrorCambio(data.error);
      }
    } catch { setErrorCambio('Error de conexión'); }
    finally { setCambiandoEstado(false); }
  }

  const fmt = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 }) + '€';
  const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtFechaHora = (f: string) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'info', label: '📋 Info' },
    { id: 'pagos', label: '💰 Pagos' },
    { id: 'documentos', label: '📄 Docs' },
    { id: 'timeline', label: '📝 Actividad' },
    { id: 'incidencias', label: '⚠️ Incidencias', badge: obra?.incidenciasAbiertas },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 lg:pt-12 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-10" onClick={(e) => e.stopPropagation()}>
        {loading || !obra ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 border-b border-auro-border flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-auro-orange">{obra.codigo}</span>
                  {obra.tieneIncidenciaCritica && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-estado-red/10 text-estado-red">
                      ⚠️ Incidencia crítica
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-auro-navy truncate">
                  {obra.cliente.nombre} {obra.cliente.apellidos}
                </h3>
                {obra.direccionInstalacion && (
                  <p className="text-xs text-auro-navy/40 mt-0.5">📍 {obra.direccionInstalacion}{obra.localidad ? `, ${obra.localidad}` : ''}</p>
                )}
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-auro-surface-2 hover:bg-auro-surface-3 flex items-center justify-center text-lg transition-colors shrink-0 ml-3">✕</button>
            </div>

            {/* Estado actual + cambiar */}
            <div className="p-5 bg-auro-surface-2/50 border-b border-auro-border">
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${ESTADO_CONFIG[obra.estado]?.bgClass || ''} ${ESTADO_CONFIG[obra.estado]?.textClass || ''}`}>
                  {ESTADO_CONFIG[obra.estado]?.icon} {ESTADO_CONFIG[obra.estado]?.label || obra.estado}
                </span>
                <span className="text-xs text-auro-navy/30">
                  {obra.fechaInicio && `Inicio: ${fmtFecha(obra.fechaInicio)}`}
                </span>
              </div>

              {obra.transicionesDisponibles.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-auro-navy/40 mb-2">Cambiar estado:</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {obra.transicionesDisponibles.map((est) => (
                      <button
                        key={est}
                        onClick={() => cambiarEstado(est)}
                        disabled={cambiandoEstado}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-white border border-auro-border hover:border-auro-orange hover:text-auro-orange transition-colors disabled:opacity-50"
                      >
                        {ESTADO_CONFIG[est]?.icon || ''} {ESTADO_CONFIG[est]?.label || est}
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
                  {errorCambio && (
                    <div className="mt-2 text-xs text-estado-red bg-estado-red/5 border border-estado-red/10 rounded-lg px-3 py-2">
                      ⚠️ {errorCambio}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-auro-border overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center transition-colors border-b-2 whitespace-nowrap
                    ${tab === t.id ? 'text-auro-orange border-auro-orange' : 'text-auro-navy/30 border-transparent hover:text-auro-navy/50'}`}
                >
                  {t.label}
                  {t.badge && t.badge > 0 ? <span className="ml-1 bg-estado-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
                </button>
              ))}
            </div>

            {/* Contenido tab */}
            <div className="p-5 max-h-[450px] overflow-y-auto">
              {/* TAB INFO */}
              {tab === 'info' && (
                <div className="space-y-5">
                  {/* KPIs económicos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Presupuesto', value: fmt(obra.presupuestoTotal), color: 'text-auro-navy' },
                      { label: 'Cobrado', value: `${fmt(obra.totalCobrado)} (${obra.porcentajeCobro}%)`, color: 'text-estado-green' },
                      { label: 'Pendiente', value: fmt(obra.pendiente), color: obra.pendiente > 0 ? 'text-estado-red' : 'text-estado-green' },
                      { label: 'Margen', value: `${obra.margen}%`, color: obra.margen >= 25 ? 'text-estado-green' : 'text-estado-amber' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-auro-surface-2 rounded-xl p-3">
                        <div className="text-[10px] font-semibold text-auro-navy/30 uppercase">{kpi.label}</div>
                        <div className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</div>
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
                      {obra.bateriaKwh && <div><span className="text-auro-navy/40">Batería:</span> <span className="font-medium">{obra.bateriaKwh} kWh</span></div>}
                    </div>
                  </div>

                  {/* Equipo */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Equipo asignado</div>
                    <div className="text-sm space-y-1">
                      {obra.comercial && (
                        <div><span className="text-auro-navy/40">Comercial:</span> <span className="font-medium">{obra.comercial.nombre} {obra.comercial.apellidos}</span></div>
                      )}
                      {obra.instaladores.length > 0 ? obra.instaladores.map((inst, i) => (
                        <div key={i}><span className="text-auro-navy/40">{inst.esJefe ? 'Jefe inst.:' : 'Instalador:'}</span> <span className="font-medium">{inst.instalador.nombre} {inst.instalador.apellidos}</span></div>
                      )) : (
                        <div className="text-auro-navy/30 italic">Sin instaladores asignados</div>
                      )}
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

                  {/* Fechas */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider mb-2">Fechas clave</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-auro-navy/40">Creación:</span> <span className="font-medium">{fmtFecha(obra.fechaCreacion)}</span></div>
                      {obra.fechaProgramada && <div><span className="text-auro-navy/40">Programada:</span> <span className="font-medium">{fmtFecha(obra.fechaProgramada)}</span></div>}
                      {obra.fechaInicio && <div><span className="text-auro-navy/40">Inicio:</span> <span className="font-medium">{fmtFecha(obra.fechaInicio)}</span></div>}
                      {obra.fechaFin && <div><span className="text-auro-navy/40">Fin:</span> <span className="font-medium">{fmtFecha(obra.fechaFin)}</span></div>}
                      {obra.fechaValidacion && <div><span className="text-auro-navy/40">Validación:</span> <span className="font-medium">{fmtFecha(obra.fechaValidacion)}</span></div>}
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

              {/* TAB PAGOS */}
              {tab === 'pagos' && (
                <div className="space-y-4">
                  {/* Barra de progreso */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-auro-navy/40">Cobrado: {fmt(obra.totalCobrado)}</span>
                      <span className="font-bold text-auro-navy">{obra.porcentajeCobro}%</span>
                    </div>
                    <div className="h-2.5 bg-auro-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-estado-green rounded-full transition-all" style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }} />
                    </div>
                  </div>

                  {/* Plan de pagos */}
                  {obra.planPagos.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-auro-navy/30 uppercase mb-2">Plan de pagos</div>
                      {obra.planPagos.map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-auro-border/50 last:border-0">
                          <span className={`text-lg ${p.pagado ? '' : 'opacity-30'}`}>{p.pagado ? '✅' : '⬜'}</span>
                          <div className="flex-1"><span className="text-sm font-medium">{p.concepto}</span></div>
                          <span className="text-sm font-bold">{fmt(p.importe)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagos registrados */}
                  <div>
                    <div className="text-xs font-semibold text-auro-navy/30 uppercase mb-2">Pagos registrados ({obra.pagos.length})</div>
                    {obra.pagos.length === 0 ? (
                      <p className="text-sm text-auro-navy/30 text-center py-4">Sin pagos registrados</p>
                    ) : obra.pagos.map(p => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-auro-border/50 last:border-0">
                        <span className="text-lg">💰</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{fmt(p.importe)}</div>
                          <div className="text-[10px] text-auro-navy/30">{p.metodo} · {fmtFecha(p.fechaCobro)} · {p.registradoPor.nombre}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB DOCUMENTOS */}
              {tab === 'documentos' && (
                <div className="space-y-2">
                  {obra.documentos.length === 0 ? (
                    <p className="text-sm text-auro-navy/30 text-center py-6">Sin documentos</p>
                  ) : obra.documentos.map(d => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-auro-border/50 last:border-0">
                      <span className="text-lg">📄</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{d.nombre}</div>
                        <div className="text-[10px] text-auro-navy/30">{d.tipo} · {fmtFecha(d.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB TIMELINE */}
              {tab === 'timeline' && (
                <div className="space-y-3">
                  {obra.actividades.length === 0 ? (
                    <p className="text-sm text-auro-navy/30 text-center py-6">Sin actividad registrada</p>
                  ) : obra.actividades.map((act, i) => {
                    let detalleParsed: any = {};
                    try { detalleParsed = act.detalle ? JSON.parse(act.detalle) : {}; } catch {}

                    const iconMap: Record<string, string> = {
                      ESTADO_CAMBIADO: '🔄', PAGO_REGISTRADO: '💰', OBRA_CREADA: '✨',
                      CHECKIN_REGISTRADO: '📍', INSTALADORES_ASIGNADOS: '👷', OBRA_EDITADA: '✏️',
                    };

                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-auro-surface-2 flex items-center justify-center text-xs shrink-0">
                          {iconMap[act.accion] || '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-auro-navy">
                            {act.accion.replace(/_/g, ' ')}
                          </div>
                          {detalleParsed.estadoAnterior && (
                            <p className="text-xs text-auro-navy/50">
                              {ESTADO_CONFIG[detalleParsed.estadoAnterior]?.label} → {ESTADO_CONFIG[detalleParsed.nuevoEstado]?.label}
                              {detalleParsed.nota && ` · "${detalleParsed.nota}"`}
                              {detalleParsed.override && ' ⚡ Override'}
                            </p>
                          )}
                          <div className="text-[10px] text-auro-navy/25 mt-0.5">
                            {act.usuario.nombre} · {fmtFechaHora(act.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB INCIDENCIAS */}
              {tab === 'incidencias' && (
                <div className="space-y-3">
                  {obra.incidencias.length === 0 ? (
                    <p className="text-sm text-auro-navy/30 text-center py-6">Sin incidencias 🎉</p>
                  ) : obra.incidencias.map((inc) => (
                    <div key={inc.id} className="bg-auro-surface-2 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold ${
                          inc.gravedad === 'CRITICA' || inc.gravedad === 'ALTA' ? 'text-estado-red' :
                          inc.gravedad === 'MEDIA' ? 'text-estado-amber' : 'text-estado-blue'
                        }`}>
                          {inc.gravedad === 'CRITICA' ? '🔴' : inc.gravedad === 'ALTA' ? '🟠' : inc.gravedad === 'MEDIA' ? '🟡' : '🔵'} {inc.gravedad}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          inc.estado === 'ABIERTA' ? 'bg-estado-red/10 text-estado-red' :
                          inc.estado === 'EN_PROCESO' ? 'bg-estado-amber/10 text-estado-amber' :
                          'bg-estado-green/10 text-estado-green'
                        }`}>{inc.estado}</span>
                        {inc.categoria && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-auro-surface-3 text-auro-navy/50">{inc.categoria}</span>
                        )}
                      </div>
                      <p className="text-sm text-auro-navy/70">{inc.descripcion}</p>
                      <div className="text-[10px] text-auro-navy/25 mt-1">{fmtFecha(inc.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
