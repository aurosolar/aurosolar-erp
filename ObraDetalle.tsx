// src/components/obras/ObraDetalle.tsx
// Sprint 2: Motor de gates integrado, TERMINADA eliminado
'use client';

import { useState, useEffect, useCallback } from 'react';
import { GateBlocker } from './GateBlocker';
import { OverrideModal } from './OverrideModal';
import { ChecklistReview } from './ChecklistReview';
import type { TransitionResult } from '@/services/gate-engine';

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
  planPagos: Array<{ id: string; concepto: string; importe: number; pagado: boolean; fechaPrevista: string | null; requiereParaEstado: string | null }>;
  pagos: Array<{ id: string; importe: number; metodo: string; fechaCobro: string; concepto: string | null; registradoPor: { nombre: string } }>;
  actividades: Array<{ accion: string; detalle: string | null; createdAt: string; usuario: { nombre: string } }>;
  incidencias: Array<{ id: string; gravedad: string; estado: string; descripcion: string; categoria: string | null; createdAt: string }>;
  documentos: Array<{ id: string; tipo: string; nombre: string; createdAt: string }>;
  gastos: Array<{ id: string; tipo: string; importe: number; descripcion: string | null; estado: string; createdAt: string }>;
  checklistValidaciones?: Array<{
    id: string;
    status: string;
    resultado: string;
    serialInversor: string | null;
    serialBateria: string | null;
    observaciones: string | null;
    reviewNotes: string | null;
    reviewDecision: string | null;
    submittedBy: { nombre: string; apellidos: string } | null;
    reviewedBy: { nombre: string; apellidos: string } | null;
    items: Array<{ codigo: string; critico: boolean; respuesta: string | null; label: string }>;
  }>;
}

const ESTADO_CONFIG: Record<string, { label: string; icon: string; bgClass: string; textClass: string }> = {
  REVISION_TECNICA:      { label: 'Revisión técnica',     icon: '🔍', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  PREPARANDO:            { label: 'Preparando',           icon: '📋', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',        icon: '📦', bgClass: 'bg-estado-amber/10',  textClass: 'text-estado-amber' },
  PROGRAMADA:            { label: 'Programada',           icon: '📅', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  INSTALANDO:            { label: 'Instalando',           icon: '⚡', bgClass: 'bg-estado-amber/10',  textClass: 'text-estado-amber' },
  VALIDACION_OPERATIVA:  { label: 'Validación operativa', icon: '✅', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  REVISION_COORDINADOR:  { label: 'Revisión coordinador', icon: '👷', bgClass: 'bg-estado-purple/10', textClass: 'text-estado-purple' },
  LEGALIZACION:          { label: 'Legalización',         icon: '📋', bgClass: 'bg-estado-blue/10',   textClass: 'text-estado-blue' },
  LEGALIZADA:            { label: 'Legalizada',           icon: '✅', bgClass: 'bg-estado-green/10',  textClass: 'text-estado-green' },
  COMPLETADA:            { label: 'Completada',           icon: '🏆', bgClass: 'bg-estado-green/10',  textClass: 'text-estado-green' },
  CANCELADA:             { label: 'Cancelada',            icon: '❌', bgClass: 'bg-estado-red/10',    textClass: 'text-estado-red' },
};

type TabId = 'info' | 'pagos' | 'documentos' | 'timeline' | 'incidencias' | 'validacion';

interface Props {
  obraId: string;
  userRol?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ObraDetalle({ obraId, userRol = 'ADMIN', onClose, onUpdate }: Props) {
  const [obra, setObra] = useState<ObraDetalleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('info');

  // Gate engine state
  const [estadoTarget, setEstadoTarget] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<TransitionResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [notaCambio, setNotaCambio] = useState('');
  const [errorCambio, setErrorCambio] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canOverride = ['ADMIN', 'JEFE_INSTALACIONES'].includes(userRol);
  const canReview = ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'].includes(userRol);

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

  // ── Pre-evaluar transición (GET evaluate-transition) ──
  const evaluateTransition = useCallback(async (targetEstado: string) => {
    setEstadoTarget(targetEstado);
    setEvaluation(null);
    setEvaluating(true);
    setErrorCambio('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/obras/${obraId}/evaluate-transition?to=${targetEstado}`);
      const data = await res.json();
      if (data.ok) {
        setEvaluation(data.data);
      } else {
        setErrorCambio(data.error || 'Error al evaluar transición');
      }
    } catch (err) {
      setErrorCambio('Error de conexión');
    } finally {
      setEvaluating(false);
    }
  }, [obraId]);

  // ── Ejecutar cambio de estado (PATCH) ──
  async function ejecutarCambio(override = false) {
    if (!estadoTarget) return;
    setCambiandoEstado(true);
    setErrorCambio('');

    try {
      const body: Record<string, unknown> = { estado: estadoTarget };
      if (notaCambio.trim()) body.nota = notaCambio.trim();
      if (override) body.override = true;

      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        const cfg = ESTADO_CONFIG[estadoTarget];
        setSuccessMsg(`${cfg?.icon || '✅'} Cambiado a ${cfg?.label || estadoTarget}${override ? ' (override)' : ''}`);
        setEstadoTarget(null);
        setEvaluation(null);
        setNotaCambio('');
        setShowOverride(false);
        await fetchObra();
        onUpdate();
      } else if (res.status === 422 && data.data) {
        // Gates fallidos — actualizar evaluación
        setEvaluation(data.data);
      } else {
        setErrorCambio(data.error || 'Error al cambiar estado');
      }
    } catch (err) {
      setErrorCambio('Error de conexión');
    } finally {
      setCambiandoEstado(false);
    }
  }

  function resetEstadoUI() {
    setEstadoTarget(null);
    setEvaluation(null);
    setNotaCambio('');
    setErrorCambio('');
    setShowOverride(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-auro-orange/30 border-t-auro-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!obra) {
    return <div className="text-center text-auro-navy/40 py-12">Obra no encontrada</div>;
  }

  const estadoCfg = ESTADO_CONFIG[obra.estado] || { label: obra.estado, icon: '❓', bgClass: 'bg-gray-100', textClass: 'text-gray-600' };

  // Tabs con validación visible si procede
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'info', label: 'Info', icon: '📋' },
    { id: 'pagos', label: 'Pagos', icon: '💰' },
    { id: 'documentos', label: 'Docs', icon: '📄' },
    { id: 'timeline', label: 'Timeline', icon: '📊' },
    { id: 'incidencias', label: 'Incidencias', icon: '⚠️' },
  ];
  if (obra.checklistValidaciones?.length || ['VALIDACION_OPERATIVA', 'REVISION_COORDINADOR'].includes(obra.estado)) {
    tabs.push({ id: 'validacion', label: 'Validación', icon: '✅' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-auro-border bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-auro-navy/40 hover:text-auro-navy transition-colors">
            ← Volver
          </button>
          <h2 className="font-bold text-auro-navy">{obra.codigo}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${estadoCfg.bgClass} ${estadoCfg.textClass}`}>
            {estadoCfg.icon} {estadoCfg.label}
          </span>
          {obra.tieneIncidenciaCritica && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-estado-red/10 text-estado-red">
              🚨 Incidencia crítica
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-auro-border bg-auro-surface overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-auro-orange text-white' : 'text-auro-navy/60 hover:bg-auro-surface-2'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Success message */}
        {successMsg && (
          <div className="bg-estado-green/10 border border-estado-green/20 rounded-xl px-4 py-3 text-sm text-estado-green font-medium flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-estado-green/60 hover:text-estado-green">✕</button>
          </div>
        )}

        {/* ═══ CAMBIO DE ESTADO (siempre visible arriba) ═══ */}
        {obra.transicionesDisponibles.length > 0 && (
          <div className="bg-white border border-auro-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-auro-navy/60 uppercase">Cambiar estado</h3>

            {/* Botones de transiciones disponibles */}
            {!estadoTarget && (
              <div className="flex flex-wrap gap-2">
                {obra.transicionesDisponibles.map(est => {
                  const cfg = ESTADO_CONFIG[est];
                  if (!cfg) return null;
                  return (
                    <button
                      key={est}
                      onClick={() => evaluateTransition(est)}
                      className="px-3 py-2 rounded-lg border border-auro-border text-xs font-medium hover:border-auro-orange/40 hover:bg-auro-orange/5 transition-colors min-h-[44px]"
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Evaluando... */}
            {evaluating && (
              <div className="flex items-center gap-2 text-sm text-auro-navy/40">
                <div className="w-4 h-4 border-2 border-auro-orange/30 border-t-auro-orange rounded-full animate-spin" />
                Evaluando requisitos...
              </div>
            )}

            {/* Resultado de evaluación */}
            {estadoTarget && evaluation && !evaluating && (
              <div className="space-y-3">
                {evaluation.allowed ? (
                  /* ✅ Gates pasan — confirmar */
                  <div className="space-y-3">
                    <div className="text-sm text-estado-green font-medium">
                      ✅ Todos los requisitos cumplidos para {ESTADO_CONFIG[estadoTarget]?.label}
                    </div>

                    {/* Campo nota (obligatorio para cancelación/reapertura, opcional para el resto) */}
                    {(estadoTarget === 'CANCELADA' || (obra.estado === 'CANCELADA' && estadoTarget === 'REVISION_TECNICA')) ? (
                      <textarea
                        value={notaCambio}
                        onChange={(e) => setNotaCambio(e.target.value)}
                        placeholder="Motivo obligatorio (mín. 10 caracteres)"
                        rows={2}
                        className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-lg text-sm placeholder-auro-navy/25 focus:outline-none focus:border-auro-orange/40"
                      />
                    ) : (
                      <input
                        value={notaCambio}
                        onChange={(e) => setNotaCambio(e.target.value)}
                        placeholder="Nota opcional"
                        className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-lg text-sm placeholder-auro-navy/25 focus:outline-none focus:border-auro-orange/40"
                      />
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => ejecutarCambio(false)}
                        disabled={cambiandoEstado}
                        className="flex-1 h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {cambiandoEstado ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>{ESTADO_CONFIG[estadoTarget]?.icon} Confirmar cambio</>
                        )}
                      </button>
                      <button onClick={resetEstadoUI} className="px-4 h-11 border border-auro-border rounded-lg text-sm text-auro-navy/60 hover:bg-auro-surface-2">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ❌ Gates fallidos — mostrar GateBlocker */
                  <div className="space-y-3">
                    <GateBlocker
                      result={evaluation}
                      from={obra.estado}
                      to={estadoTarget}
                      canOverride={canOverride}
                      onOverride={() => setShowOverride(true)}
                    />
                  </div>
                )}
              </div>
            )}

            {errorCambio && (
              <div className="bg-estado-red/10 border border-estado-red/20 rounded-xl px-3 py-2 text-xs text-estado-red font-medium">
                ⚠️ {errorCambio}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB CONTENT ═══ */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Cliente */}
            <div className="bg-white border border-auro-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Cliente</h3>
              <p className="font-medium text-auro-navy">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
              {obra.cliente.telefono && <p className="text-sm text-auro-navy/60">{obra.cliente.telefono}</p>}
              {obra.cliente.email && <p className="text-sm text-auro-navy/60">{obra.cliente.email}</p>}
            </div>

            {/* Datos técnicos */}
            <div className="bg-white border border-auro-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Datos técnicos</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-auro-navy/40">Tipo:</span> {obra.tipo}</div>
                {obra.potenciaKwp && <div><span className="text-auro-navy/40">Potencia:</span> {obra.potenciaKwp} kWp</div>}
                {obra.numPaneles && <div><span className="text-auro-navy/40">Paneles:</span> {obra.numPaneles}</div>}
                {obra.inversor && <div><span className="text-auro-navy/40">Inversor:</span> {obra.inversor}</div>}
                {obra.bateriaKwh && <div><span className="text-auro-navy/40">Batería:</span> {obra.bateriaKwh} kWh</div>}
                {obra.direccionInstalacion && <div className="col-span-2"><span className="text-auro-navy/40">Dirección:</span> {obra.direccionInstalacion}</div>}
              </div>
            </div>

            {/* Financiero */}
            <div className="bg-white border border-auro-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Financiero</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-auro-navy/40">Presupuesto:</span> {(obra.presupuestoTotal / 100).toFixed(2)}€</div>
                <div><span className="text-auro-navy/40">Cobrado:</span> {(obra.totalCobrado / 100).toFixed(2)}€ ({obra.porcentajeCobro}%)</div>
                <div><span className="text-auro-navy/40">Pendiente:</span> {(obra.pendiente / 100).toFixed(2)}€</div>
                <div><span className="text-auro-navy/40">Gastos:</span> {(obra.totalGastos / 100).toFixed(2)}€</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'pagos' && (
          <div className="space-y-4">
            {/* Plan de pagos */}
            <div className="bg-white border border-auro-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Plan de pagos</h3>
              {obra.planPagos.length === 0 ? (
                <p className="text-sm text-auro-navy/40">Sin plan de pagos definido</p>
              ) : (
                <div className="space-y-2">
                  {obra.planPagos.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{h.pagado ? '✅' : '⏳'}</span>
                        <span className={h.pagado ? 'text-auro-navy' : 'text-auro-navy/60'}>{h.concepto}</span>
                        {h.requiereParaEstado && (
                          <span className="px-1.5 py-0.5 bg-estado-amber/10 text-estado-amber text-[10px] rounded font-medium">
                            req. {ESTADO_CONFIG[h.requiereParaEstado]?.label || h.requiereParaEstado}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{(h.importe / 100).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagos realizados */}
            <div className="bg-white border border-auro-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Cobros registrados</h3>
              {obra.pagos.length === 0 ? (
                <p className="text-sm text-auro-navy/40">Sin cobros registrados</p>
              ) : (
                <div className="space-y-2">
                  {obra.pagos.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{(p.importe / 100).toFixed(2)}€</span>
                        <span className="text-auro-navy/40 ml-2">{p.metodo}</span>
                        {p.concepto && <span className="text-auro-navy/40 ml-2">— {p.concepto}</span>}
                      </div>
                      <span className="text-xs text-auro-navy/40">{new Date(p.fechaCobro).toLocaleDateString('es-ES')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'documentos' && (
          <div className="bg-white border border-auro-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Documentos</h3>
            {obra.documentos.length === 0 ? (
              <p className="text-sm text-auro-navy/40">Sin documentos</p>
            ) : (
              <div className="space-y-2">
                {obra.documentos.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span>{d.nombre}</span>
                      <span className="px-1.5 py-0.5 bg-auro-surface-2 text-auro-navy/40 text-[10px] rounded">{d.tipo}</span>
                    </div>
                    <span className="text-xs text-auro-navy/40">{new Date(d.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="bg-white border border-auro-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Actividad reciente</h3>
            <div className="space-y-3">
              {obra.actividades.map((a, i) => {
                let detalle: Record<string, string> = {};
                try { detalle = a.detalle ? JSON.parse(a.detalle) : {}; } catch { /* ignore */ }
                const isOverride = a.accion === 'OVERRIDE_ESTADO';

                return (
                  <div key={i} className={`flex gap-3 text-sm ${isOverride ? 'bg-estado-amber/5 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                    <div className="text-xs text-auro-navy/30 w-16 shrink-0 pt-0.5">
                      {new Date(a.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-auro-navy/80">{a.usuario.nombre}</span>
                      <span className="text-auro-navy/40 ml-1">
                        {a.accion === 'ESTADO_CAMBIADO' && detalle.estadoAnterior
                          ? `cambió estado: ${ESTADO_CONFIG[detalle.estadoAnterior]?.label || detalle.estadoAnterior} → ${ESTADO_CONFIG[detalle.nuevoEstado]?.label || detalle.nuevoEstado}`
                          : a.accion === 'OVERRIDE_ESTADO'
                            ? `⚠️ Override: ${detalle.estadoAnterior} → ${detalle.nuevoEstado}. Motivo: ${detalle.motivoOverride || '—'}`
                            : a.accion.toLowerCase().replace(/_/g, ' ')
                        }
                      </span>
                      {detalle.nota && <p className="text-xs text-auro-navy/30 mt-0.5">&ldquo;{detalle.nota}&rdquo;</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'incidencias' && (
          <div className="bg-white border border-auro-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-auro-navy/60 uppercase mb-2">Incidencias</h3>
            {obra.incidencias.length === 0 ? (
              <p className="text-sm text-auro-navy/40">Sin incidencias</p>
            ) : (
              <div className="space-y-2">
                {obra.incidencias.map(inc => (
                  <div key={inc.id} className="flex items-center justify-between text-sm border border-auro-border rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inc.gravedad === 'CRITICA' ? 'bg-estado-red/10 text-estado-red' :
                        inc.gravedad === 'ALTA' ? 'bg-estado-amber/10 text-estado-amber' :
                        'bg-auro-surface-2 text-auro-navy/60'
                      }`}>{inc.gravedad}</span>
                      <span>{inc.descripcion}</span>
                    </div>
                    <span className={`text-xs font-medium ${
                      inc.estado === 'ABIERTA' ? 'text-estado-red' :
                      inc.estado === 'EN_PROCESO' ? 'text-estado-amber' :
                      'text-estado-green'
                    }`}>{inc.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'validacion' && (
          <div className="space-y-4">
            {obra.checklistValidaciones && obra.checklistValidaciones.length > 0 ? (
              <ChecklistReview
                checklist={obra.checklistValidaciones[0] as any}
                obraId={obra.id}
                canReview={canReview && obra.estado === 'REVISION_COORDINADOR'}
                onReviewComplete={() => fetchObra()}
              />
            ) : (
              <div className="bg-white border border-auro-border rounded-xl p-4">
                <p className="text-sm text-auro-navy/40">No hay checklist de validación para esta obra.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Override Modal */}
      {showOverride && estadoTarget && evaluation && (
        <OverrideModal
          open={showOverride}
          gatesFallidos={evaluation.gates.filter(g => !g.passed)}
          from={obra.estado}
          to={estadoTarget}
          loading={cambiandoEstado}
          onConfirm={(motivo: string) => {
            setNotaCambio(motivo);
            ejecutarCambio(true);
          }}
          onCancel={() => {
            setShowOverride(false);
          }}
        />
      )}
    </div>
  );
}
