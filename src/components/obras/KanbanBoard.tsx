// src/components/obras/KanbanBoard.tsx
// Sprint UX-2: Rediseño Kanban estilo InstalaPRO/Stitch
// 7 columnas agrupadas, cards mejoradas, resumen alertas, responsive
'use client';

import { useState, useRef, useMemo } from 'react';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface KanbanObra {
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

interface GateResultItem { gate: string; passed: boolean; reason?: string }
interface TransitionEval { allowed: boolean; isOverride: boolean; gates: GateResultItem[]; reasons: string[] }

// ═══════════════════════════════════════
// COLUMN CONFIG — 7 columnas agrupadas
// ═══════════════════════════════════════
interface KanbanColumn {
  key: string;
  label: string;
  icon: string;
  estados: string[];        // estados reales que agrupa
  color: string;            // hex for accents
  bgColumn: string;         // tailwind bg for column
  borderAccent: string;     // tailwind border for active column
  isHighlight?: boolean;    // "Instalando" gets special treatment
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    key: 'revision',
    label: 'Revisión',
    icon: '🔍',
    estados: ['REVISION_TECNICA'],
    color: '#8B5CF6',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-purple/20',
  },
  {
    key: 'preparacion',
    label: 'Preparación',
    icon: '📦',
    estados: ['PREPARANDO', 'PENDIENTE_MATERIAL'],
    color: '#F59E0B',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-amber/20',
  },
  {
    key: 'programada',
    label: 'Programada',
    icon: '📅',
    estados: ['PROGRAMADA'],
    color: '#3B82F6',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-blue/20',
  },
  {
    key: 'instalando',
    label: 'Instalando',
    icon: '⚡',
    estados: ['INSTALANDO'],
    color: '#16A34A',
    bgColumn: 'bg-estado-green/[0.04]',
    borderAccent: 'border-estado-green/30',
    isHighlight: true,
  },
  {
    key: 'validacion',
    label: 'Validación',
    icon: '✅',
    estados: ['VALIDACION_OPERATIVA', 'REVISION_COORDINADOR'],
    color: '#8B5CF6',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-purple/20',
  },
  {
    key: 'legalizacion',
    label: 'Legalización',
    icon: '📋',
    estados: ['LEGALIZACION', 'LEGALIZADA'],
    color: '#3B82F6',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-blue/20',
  },
  {
    key: 'completada',
    label: 'Completada',
    icon: '🏆',
    estados: ['COMPLETADA'],
    color: '#10B981',
    bgColumn: 'bg-white/60',
    borderAccent: 'border-estado-green/20',
  },
];

// Map estado -> fase (0-based index in flow for progress indicator)
const ESTADO_FASE: Record<string, number> = {
  REVISION_TECNICA: 0, PREPARANDO: 1, PENDIENTE_MATERIAL: 1,
  PROGRAMADA: 2, INSTALANDO: 3, VALIDACION_OPERATIVA: 4,
  REVISION_COORDINADOR: 4, LEGALIZACION: 5, LEGALIZADA: 5,
  COMPLETADA: 6, CANCELADA: -1,
};
const TOTAL_FASES = 7;

// Sub-estado labels for grouped columns
const SUB_ESTADO: Record<string, { label: string; color: string }> = {
  PREPARANDO:            { label: 'Preparando',     color: 'text-estado-amber' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',  color: 'text-estado-red' },
  VALIDACION_OPERATIVA:  { label: 'Val. Operativa', color: 'text-estado-purple' },
  REVISION_COORDINADOR:  { label: 'Rev. Coord.',    color: 'text-estado-purple' },
  LEGALIZACION:          { label: 'Legalización',   color: 'text-estado-blue' },
  LEGALIZADA:            { label: 'Legalizada',     color: 'text-estado-green' },
};

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
  ALQUILER_CUBIERTA: '🏭', REPARACION: '🔧', SUSTITUCION: '🔄',
};

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
interface Props {
  obras: KanbanObra[];
  onObraClick: (obraId: string) => void;
  onUpdate: () => void;
  userRol?: string;
}

export function KanbanBoard({ obras, onObraClick, onUpdate, userRol = 'ADMIN' }: Props) {
  const [draggedObra, setDraggedObra] = useState<KanbanObra | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<{ obraId: string; to: string; eval: TransitionEval } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [overrideMotivo, setOverrideMotivo] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [mobileCol, setMobileCol] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canOverride = ['ADMIN', 'JEFE_INSTALACIONES'].includes(userRol);

  // Group obras by kanban column
  const obrasByColumn = useMemo(() => {
    const map: Record<string, KanbanObra[]> = {};
    KANBAN_COLUMNS.forEach(col => { map[col.key] = []; });
    obras.forEach(obra => {
      const col = KANBAN_COLUMNS.find(c => c.estados.includes(obra.estado));
      if (col) map[col.key].push(obra);
    });
    return map;
  }, [obras]);

  // Summary alerts
  const alertas = useMemo(() => {
    let incidencias = 0;
    let pteMaterial = 0;
    obras.forEach(o => {
      incidencias += o._count.incidencias;
      if (o.estado === 'PENDIENTE_MATERIAL') pteMaterial++;
    });
    return { incidencias, pteMaterial };
  }, [obras]);

  // ── Drag & Drop handlers ──
  function handleDragStart(e: React.DragEvent, obra: KanbanObra) {
    setDraggedObra(obra);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', obra.id);
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  }
  function handleDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedObra(null);
    setDragOverColumn(null);
  }
  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colKey) setDragOverColumn(colKey);
  }
  function handleDragLeave() { setDragOverColumn(null); }

  async function handleDrop(e: React.DragEvent, col: KanbanColumn) {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedObra) return;
    // If dropping in same column, ignore
    if (col.estados.includes(draggedObra.estado)) { setDraggedObra(null); return; }
    // Target estado = first estado of the column (primary)
    const targetEstado = col.estados[0];
    await evaluateAndMaybeTransition(draggedObra, targetEstado);
    setDraggedObra(null);
  }

  async function evaluateAndMaybeTransition(obra: KanbanObra, targetEstado: string) {
    setEvaluating(obra.id);
    setEvalResult(null);
    try {
      const res = await fetch(`/api/obras/${obra.id}/evaluate-transition?to=${targetEstado}`);
      const data = await res.json();
      if (!data.ok) { showToast('error', data.error || 'Error evaluando'); setEvaluating(null); return; }
      const evaluation: TransitionEval = data.data;
      if (evaluation.allowed) {
        await executeTransition(obra.id, targetEstado, false);
      } else {
        setEvalResult({ obraId: obra.id, to: targetEstado, eval: evaluation });
      }
    } catch { showToast('error', 'Error de conexión'); }
    finally { setEvaluating(null); }
  }

  async function executeTransition(obraId: string, targetEstado: string, override: boolean, nota?: string) {
    setExecuting(true);
    try {
      const body: Record<string, unknown> = { estado: targetEstado };
      if (override) body.override = true;
      if (nota) body.nota = nota;
      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        const col = KANBAN_COLUMNS.find(c => c.estados.includes(targetEstado));
        showToast('success', `${col?.icon || '✅'} Movida a ${col?.label || targetEstado}${override ? ' (override)' : ''}`);
        setEvalResult(null); setShowOverrideInput(false); setOverrideMotivo('');
        onUpdate();
      } else {
        showToast('error', data.error || 'Error al cambiar estado');
      }
    } catch { showToast('error', 'Error de conexión'); }
    finally { setExecuting(false); }
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }
  function dismissEvalResult() { setEvalResult(null); setShowOverrideInput(false); setOverrideMotivo(''); }

  return (
    <div className="relative">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-slide-up ${
          toast.type === 'success' ? 'bg-estado-green text-white' : 'bg-estado-red text-white'
        }`}>{toast.msg}</div>
      )}

      {/* ── Evaluating indicator ── */}
      {evaluating && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-xl px-5 py-3 flex items-center gap-3 border border-slate-200">
          <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-600">Evaluando requisitos...</span>
        </div>
      )}

      {/* ── Transition blocked modal ── */}
      {evalResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={dismissEvalResult} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-5 py-4">
              <h3 className="text-sm font-bold text-red-800">Transición bloqueada</h3>
              <p className="text-xs text-red-600 mt-0.5">
                {obras.find(o => o.id === evalResult.obraId)?.codigo} → {KANBAN_COLUMNS.find(c => c.estados.includes(evalResult.to))?.label}
              </p>
            </div>
            <div className="p-5 space-y-2 max-h-60 overflow-y-auto">
              {evalResult.eval.gates.filter(g => !g.passed).map(g => (
                <div key={g.gate} className="flex items-start gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                  <span className="text-red-500 shrink-0">❌</span>
                  <div>
                    <p className="text-sm text-red-800">{g.reason}</p>
                    <p className="text-[10px] text-red-400 font-mono mt-0.5">{g.gate}</p>
                  </div>
                </div>
              ))}
            </div>
            {canOverride && !showOverrideInput && (
              <div className="px-5 pb-2">
                <button onClick={() => setShowOverrideInput(true)} className="w-full py-2.5 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                  ⚠️ Forzar transición (override)
                </button>
              </div>
            )}
            {showOverrideInput && (
              <div className="px-5 pb-2 space-y-2">
                <textarea value={overrideMotivo} onChange={e => setOverrideMotivo(e.target.value)} placeholder="Motivo obligatorio (mín. 10 caracteres)..." rows={2} className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" autoFocus />
                <p className={`text-[10px] ${overrideMotivo.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>{overrideMotivo.trim().length}/10 caracteres mínimos</p>
                <button onClick={() => executeTransition(evalResult.obraId, evalResult.to, true, overrideMotivo.trim())} disabled={overrideMotivo.trim().length < 10 || executing} className="w-full py-2.5 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors">
                  {executing ? 'Procesando...' : '⚠️ Confirmar override'}
                </button>
              </div>
            )}
            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={dismissEvalResult} className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}



      {/* ── Mobile: column tabs ── */}
      <div className="lg:hidden flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {KANBAN_COLUMNS.map((col, i) => {
          const count = (obrasByColumn[col.key] || []).length;
          const isActive = mobileCol === i;
          return (
            <button key={col.key} onClick={() => setMobileCol(i)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-white text-slate-800 border-slate-200 shadow-sm'
                  : 'bg-transparent text-slate-400 border-transparent'
              }`}>
              <span>{col.icon}</span>
              <span>{col.label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: show active column cards ── */}
      <div className="lg:hidden space-y-2 mb-4">
        {(() => {
          const col = KANBAN_COLUMNS[mobileCol];
          const colObras = obrasByColumn[col.key] || [];
          if (colObras.length === 0) return <div className="py-8 text-center text-sm text-slate-300">Sin obras en {col.label}</div>;
          return colObras.map(obra => (
            <KanbanCard key={obra.id} obra={obra} color={col.color} onClick={() => onObraClick(obra.id)}
              onDragStart={() => {}} onDragEnd={() => {}} isDragging={false} showSubEstado={col.estados.length > 1} />
          ));
        })()}
      </div>

      {/* ── Desktop: horizontal kanban ── */}
      <div ref={scrollRef} className="hidden lg:flex gap-3 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
        {KANBAN_COLUMNS.map(col => {
          const colObras = obrasByColumn[col.key] || [];
          const isDragOver = dragOverColumn === col.key;
          const isValidDrop = draggedObra && !col.estados.includes(draggedObra.estado);

          return (
            <div key={col.key}
              className={`shrink-0 flex flex-col rounded-xl border transition-all duration-200 ${col.bgColumn} ${
                isDragOver ? col.borderAccent : 'border-transparent'
              } ${col.isHighlight ? 'ring-1 ring-estado-green/20' : ''}`}
              style={{ width: '320px', scrollSnapAlign: 'start', ...(isDragOver ? { borderStyle: 'dashed', borderWidth: '2px' } : {}) }}
              onDragOver={(e) => isValidDrop ? handleDragOver(e, col.key) : undefined}
              onDragLeave={handleDragLeave}
              onDrop={(e) => isValidDrop ? handleDrop(e, col) : undefined}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{col.icon}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${col.isHighlight ? 'text-estado-green' : 'text-slate-500'}`}>
                    {col.label}
                  </span>
                </div>
                <span className="bg-white border border-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-bold min-w-[20px] text-center">
                  {colObras.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 px-2 pb-3 min-h-[100px] max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-hide">
                {colObras.map(obra => (
                  <KanbanCard key={obra.id} obra={obra} color={col.color} onClick={() => onObraClick(obra.id)}
                    onDragStart={(e) => handleDragStart(e, obra)} onDragEnd={handleDragEnd}
                    isDragging={draggedObra?.id === obra.id} showSubEstado={col.estados.length > 1} />
                ))}
                {colObras.length === 0 && !isDragOver && (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-slate-200 font-medium">Sin obras</p>
                  </div>
                )}
                {isDragOver && (
                  <div className="border-2 border-dashed rounded-xl py-5 text-center transition-all" style={{ borderColor: col.color, background: `${col.color}08` }}>
                    <p className="text-xs font-semibold" style={{ color: col.color }}>Soltar aquí</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// KANBAN CARD
// ═══════════════════════════════════════
function KanbanCard({ obra, color, onClick, onDragStart, onDragEnd, isDragging, showSubEstado = false }: {
  obra: KanbanObra; color: string; onClick: () => void;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean; showSubEstado?: boolean;
}) {
  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });
  const tipoIcon = TIPO_ICONS[obra.tipo] || '⚡';
  const fase = ESTADO_FASE[obra.estado] ?? 0;
  const pct = Math.round((fase / (TOTAL_FASES - 1)) * 100);
  const subEstado = SUB_ESTADO[obra.estado];

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-all select-none group
        shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]
        hover:border-slate-300 ${isDragging ? 'opacity-30 scale-95' : 'hover:-translate-y-0.5'}`}>

      {/* Row 1: code + sub-estado/tipo */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-slate-400">{obra.codigo}</span>
        <div className="flex items-center gap-1.5">
          {showSubEstado && subEstado && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              {subEstado.label}
            </span>
          )}
          {obra.fechaProgramada && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              {new Date(obra.fechaProgramada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <span className="text-sm" title={obra.tipo}>{tipoIcon}</span>
        </div>
      </div>

      {/* Row 2: client name */}
      <h4 className="text-sm font-semibold text-slate-800 leading-snug mb-1">
        {obra.cliente.nombre} {obra.cliente.apellidos}
      </h4>

      {/* Row 3: location */}
      {obra.localidad && (
        <p className="text-[11px] text-slate-400 truncate mb-4">📍 {obra.localidad}</p>
      )}

      {/* Row 4: progress bar with label */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
          <span>Progress</span>
          <span style={{ color: pct >= 70 ? '#16a34a' : undefined }}>{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>

      {/* Row 5: footer — avatars + alerts + cobro */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Installer avatars */}
          {obra.instaladores.length > 0 ? (
            <div className="flex -space-x-2">
              {obra.instaladores.slice(0, 2).map((inst, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center"
                  title={`${inst.instalador.nombre} ${inst.instalador.apellidos}`}>
                  <span className="text-[9px] font-bold text-slate-500">
                    {inst.instalador.nombre[0]}{inst.instalador.apellidos[0]}
                  </span>
                </div>
              ))}
              {obra.instaladores.length > 2 && (
                <div className="w-6 h-6 rounded-full bg-slate-900 ring-2 ring-white flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">+{obra.instaladores.length - 2}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-700">{euros}€</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {obra._count.incidencias > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
              ⚠ {obra._count.incidencias}
            </span>
          )}
          {obra.instaladores.length > 0 && (
            <span className="text-[11px] font-bold text-slate-700">{euros}€</span>
          )}
          {/* Cobro mini-bar */}
          <div className="flex items-center gap-1">
            <div className="w-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                obra.porcentajeCobro >= 100 ? 'bg-emerald-500' : obra.porcentajeCobro >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }} />
            </div>
            <span className="text-[9px] font-semibold text-slate-400 tabular-nums">{obra.porcentajeCobro}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
