// src/components/obras/ObraTimeline.tsx
// Timeline visual de estados con verificación HMAC
'use client';

import { useState, useEffect } from 'react';

interface TimelineEvent {
  accion: string;
  detalle: string | null;
  createdAt: string;
  usuario: { nombre: string; apellidos?: string };
  seq?: number | null;
  hash?: string | null;
}

interface HmacVerification {
  ok: boolean;
  totalEventos: number;
  eventosVerificados: number;
  primerError?: { seq: number; esperado: string; encontrado: string | null };
}

const ACCION_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  OBRA_CREADA:           { icon: '🏗️', label: 'Obra creada',           color: 'text-blue-400',   bgColor: 'bg-blue-500/15' },
  ESTADO_CAMBIADO:       { icon: '→',  label: 'Cambio de estado',      color: 'text-amber-400',  bgColor: 'bg-amber-500/15' },
  OVERRIDE_ESTADO:       { icon: '⚡', label: 'Override',              color: 'text-red-400',    bgColor: 'bg-red-500/15' },
  TRANSICION_RECHAZADA:  { icon: '🚫', label: 'Transición rechazada',  color: 'text-red-300',    bgColor: 'bg-red-500/10' },
  PAGO_REGISTRADO:       { icon: '💰', label: 'Pago registrado',       color: 'text-green-400',  bgColor: 'bg-green-500/15' },
  DOCUMENTO_SUBIDO:      { icon: '📄', label: 'Documento subido',      color: 'text-cyan-400',   bgColor: 'bg-cyan-500/15' },
  DOCUMENTO_ELIMINADO:   { icon: '🗑️', label: 'Documento eliminado',   color: 'text-red-300',    bgColor: 'bg-red-500/10' },
  FOTO_SUBIDA:           { icon: '📷', label: 'Foto subida',           color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  CHECKIN_REGISTRADO:    { icon: '📍', label: 'Check-in',              color: 'text-green-400',  bgColor: 'bg-green-500/15' },
  CHECKOUT_REGISTRADO:   { icon: '🏁', label: 'Check-out',             color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  INSTALADORES_ASIGNADOS:{ icon: '👷', label: 'Equipo asignado',       color: 'text-blue-300',   bgColor: 'bg-blue-500/10' },
  GASTO_REGISTRADO:      { icon: '💸', label: 'Gasto registrado',      color: 'text-red-300',    bgColor: 'bg-red-500/10' },
  INCIDENCIA_CREADA:     { icon: '⚠️', label: 'Incidencia',            color: 'text-amber-400',  bgColor: 'bg-amber-500/15' },
  LEGALIZACION_ACTUALIZADA: { icon: '📋', label: 'Legalización',       color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  VALIDACION_AVANZADA:   { icon: '✅', label: 'Validación',            color: 'text-green-400',  bgColor: 'bg-green-500/15' },
};

const ESTADO_LABELS: Record<string, string> = {
  REVISION_TECNICA: 'Revisión técnica', PREPARANDO: 'Preparando',
  PENDIENTE_MATERIAL: 'Pte. Material', PROGRAMADA: 'Programada',
  INSTALANDO: 'Instalando', VALIDACION_OPERATIVA: 'Validación operativa',
  REVISION_COORDINADOR: 'Revisión coordinador', TERMINADA: 'Terminada',
  LEGALIZACION: 'Legalización', LEGALIZADA: 'Legalizada',
  COMPLETADA: 'Completada', CANCELADA: 'Cancelada',
};

function parseDetalle(detalle: string | null): Record<string, any> {
  if (!detalle) return {};
  try { return JSON.parse(detalle); } catch { return {}; }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export function ObraTimeline({ obraId, actividades }: {
  obraId: string;
  actividades: TimelineEvent[];
}) {
  const [hmac, setHmac] = useState<HmacVerification | null>(null);
  const [loadingHmac, setLoadingHmac] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function verificarHmac() {
    setLoadingHmac(true);
    try {
      const res = await fetch(`/api/auditoria/verificar/${obraId}`);
      const data = await res.json();
      if (data.ok) setHmac(data.data);
    } catch (e) { console.error(e); }
    setLoadingHmac(false);
  }

  useEffect(() => { verificarHmac(); }, [obraId]);

  const toggleExpand = (idx: number) => {
    const next = new Set(expanded);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpanded(next);
  };

  return (
    <div>
      {/* HMAC Badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-auro-navy/60 uppercase tracking-wider">Timeline</h4>
        {hmac && (
          <button
            onClick={verificarHmac}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              hmac.ok
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${hmac.ok ? 'bg-green-500' : 'bg-red-500'}`} />
            {hmac.ok
              ? `${hmac.eventosVerificados} eventos verificados`
              : `Error en seq ${hmac.primerError?.seq}`
            }
          </button>
        )}
        {loadingHmac && !hmac && (
          <span className="text-xs text-auro-navy/30">Verificando integridad...</span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-auro-border" />

        <div className="space-y-0">
          {actividades.map((ev, idx) => {
            const config = ACCION_CONFIG[ev.accion] || {
              icon: '•', label: ev.accion, color: 'text-gray-400', bgColor: 'bg-gray-500/10'
            };
            const det = parseDetalle(ev.detalle);
            const isExpanded = expanded.has(idx);
            const isEstado = ev.accion === 'ESTADO_CAMBIADO' || ev.accion === 'OVERRIDE_ESTADO';
            const hasHmac = ev.seq != null;

            return (
              <div key={idx} className="relative pl-10 pb-4 group">
                {/* Nodo del timeline */}
                <div className={`absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-white ${config.bgColor}`}>
                  {isEstado ? '→' : <span className="text-[9px]">{config.icon}</span>}
                </div>

                {/* Contenido */}
                <div
                  className={`rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-auro-surface-2/50 ${
                    isExpanded ? 'bg-auro-surface-2/30' : ''
                  }`}
                  onClick={() => toggleExpand(idx)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      {isEstado && det.estadoAnterior && (
                        <span className="text-xs text-auro-navy/40">
                          {ESTADO_LABELS[det.estadoAnterior] || det.estadoAnterior}
                          {' → '}
                          <span className="font-semibold text-auro-navy/70">
                            {ESTADO_LABELS[det.nuevoEstado] || det.nuevoEstado}
                          </span>
                        </span>
                      )}
                      {det.override && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded uppercase">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasHmac && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" title={`HMAC seq ${ev.seq}`} />
                      )}
                      <span className="text-[10px] text-auro-navy/30" title={formatDate(ev.createdAt)}>
                        {timeAgo(ev.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Submeta */}
                  <div className="text-[11px] text-auro-navy/40 mt-0.5">
                    {ev.usuario.nombre}{ev.usuario.apellidos ? ` ${ev.usuario.apellidos}` : ''}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && Object.keys(det).length > 0 && (
                    <div className="mt-2 p-2 bg-auro-surface-2 rounded text-[11px] text-auro-navy/60 space-y-1">
                      {det.nota && <div><span className="font-semibold">Nota:</span> {det.nota}</div>}
                      {det.motivoOverride && <div><span className="font-semibold text-red-500">Motivo override:</span> {det.motivoOverride}</div>}
                      {det.gates && (
                        <div>
                          <span className="font-semibold">Gates:</span>{' '}
                          {det.gates.map((g: any, i: number) => (
                            <span key={i} className={`inline-block mr-1 px-1 py-0.5 rounded text-[9px] ${g.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {g.gate}
                            </span>
                          ))}
                        </div>
                      )}
                      {det.importe && <div><span className="font-semibold">Importe:</span> {(det.importe / 100).toFixed(2)}€</div>}
                      {det.reason && <div><span className="font-semibold">Motivo:</span> {det.reason}</div>}
                      <div className="text-[9px] text-auro-navy/25 pt-1 border-t border-auro-border/50">
                        {formatDate(ev.createdAt)}
                        {hasHmac && ` · HMAC seq ${ev.seq} · ${ev.hash?.substring(0, 12)}…`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {actividades.length === 0 && (
          <div className="pl-10 py-4 text-xs text-auro-navy/30">Sin actividad registrada</div>
        )}
      </div>
    </div>
  );
}
