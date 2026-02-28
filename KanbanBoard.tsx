// src/components/obras/KanbanBoard.tsx
// Tablero Kanban de obras con drag & drop + validación de gates
'use client';

import { useState, useRef, useCallback } from 'react';

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
  cliente: { id: string; nombre: string; apellidos: string; telefono: string | null };
  comercial: { nombre: string; apellidos: string } | null;
  instaladores: Array<{ instalador: { nombre: string; apellidos: string } }>;
  _count: { incidencias: number };
  tieneIncidenciaCritica?: boolean;
}

interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
}

interface TransitionEval {
  allowed: boolean;
  isOverride: boolean;
  gates: GateResult[];
  reasons: string[];
}

// Columnas del Kanban en orden del flujo
const KANBAN_COLUMNS = [
  { key: 'REVISION_TECNICA',     label: 'Revisión',          icon: '🔍', color: '#8B5CF6', bgLight: 'rgba(139,92,246,0.08)' },
  { key: 'PREPARANDO',           label: 'Preparando',        icon: '📋', color: '#F59E0B', bgLight: 'rgba(245,158,11,0.08)' },
  { key: 'PENDIENTE_MATERIAL',   label: 'Pte. Material',     icon: '📦', color: '#F59E0B', bgLight: 'rgba(245,158,11,0.08)' },
  { key: 'PROGRAMADA',           label: 'Programada',        icon: '📅', color: '#3B82F6', bgLight: 'rgba(59,130,246,0.08)' },
  { key: 'INSTALANDO',           label: 'Instalando',        icon: '⚡', color: '#F97316', bgLight: 'rgba(249,115,22,0.08)' },
  { key: 'VALIDACION_OPERATIVA', label: 'Validación',        icon: '✅', color: '#8B5CF6', bgLight: 'rgba(139,92,246,0.08)' },
  { key: 'REVISION_COORDINADOR', label: 'Rev. Coord.',       icon: '👷', color: '#8B5CF6', bgLight: 'rgba(139,92,246,0.08)' },
  { key: 'LEGALIZACION',         label: 'Legalización',      icon: '📋', color: '#3B82F6', bgLight: 'rgba(59,130,246,0.08)' },
  { key: 'LEGALIZADA',           label: 'Legalizada',        icon: '✅', color: '#10B981', bgLight: 'rgba(16,185,129,0.08)' },
  { key: 'COMPLETADA',           label: 'Completada',        icon: '🏆', color: '#10B981', bgLight: 'rgba(16,185,129,0.08)' },
];

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

interface Props {
  obras: KanbanObra[];
  onObraClick: (obraId: string) => void;
  onUpdate: () => void;
  userRol?: string;
}

export function KanbanBoard({ obras, onObraClick, onUpdate, userRol = 'ADMIN' }: Props) {
  const [draggedObra, setDraggedObra] = useState<KanbanObra | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null); // obraId being evaluated
  const [evalResult, setEvalResult] = useState<{ obraId: string; to: string; eval: TransitionEval } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [overrideMotivo, setOverrideMotivo] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canOverride = ['ADMIN', 'JEFE_INSTALACIONES'].includes(userRol);

  // Group obras by estado
  const obrasByEstado: Record<string, KanbanObra[]> = {};
  KANBAN_COLUMNS.forEach(col => { obrasByEstado[col.key] = []; });
  obras.forEach(obra => {
    if (obrasByEstado[obra.estado]) {
      obrasByEstado[obra.estado].push(obra);
    }
  });
  // Canceladas no se muestran en Kanban

  // ── Drag handlers ──
  function handleDragStart(e: React.DragEvent, obra: KanbanObra) {
    setDraggedObra(obra);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', obra.id);
    // Add drag ghost styling
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  }

  function handleDragEnd(e: React.DragEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggedObra(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent, columnKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, targetEstado: string) {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedObra || draggedObra.estado === targetEstado) {
      setDraggedObra(null);
      return;
    }

    // Evaluate transition via gate engine
    await evaluateAndMaybeTransition(draggedObra, targetEstado);
    setDraggedObra(null);
  }

  // ── Gate evaluation ──
  async function evaluateAndMaybeTransition(obra: KanbanObra, targetEstado: string) {
    setEvaluating(obra.id);
    setEvalResult(null);

    try {
      const res = await fetch(`/api/obras/${obra.id}/evaluate-transition?to=${targetEstado}`);
      const data = await res.json();

      if (!data.ok) {
        showToast('error', data.error || 'Error evaluando transición');
        setEvaluating(null);
        return;
      }

      const evaluation: TransitionEval = data.data;

      if (evaluation.allowed) {
        // Gates pass — execute directly
        await executeTransition(obra.id, targetEstado, false);
      } else {
        // Gates failed — show result
        setEvalResult({ obraId: obra.id, to: targetEstado, eval: evaluation });
      }
    } catch {
      showToast('error', 'Error de conexión');
    } finally {
      setEvaluating(null);
    }
  }

  async function executeTransition(obraId: string, targetEstado: string, override: boolean, nota?: string) {
    setExecuting(true);
    try {
      const body: Record<string, unknown> = { estado: targetEstado };
      if (override) body.override = true;
      if (nota) body.nota = nota;

      const res = await fetch(`/api/obras/${obraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        const col = KANBAN_COLUMNS.find(c => c.key === targetEstado);
        showToast('success', `${col?.icon || '✅'} Movida a ${col?.label || targetEstado}${override ? ' (override)' : ''}`);
        setEvalResult(null);
        setShowOverrideInput(false);
        setOverrideMotivo('');
        onUpdate();
      } else {
        showToast('error', data.error || 'Error al cambiar estado');
      }
    } catch {
      showToast('error', 'Error de conexión');
    } finally {
      setExecuting(false);
    }
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function dismissEvalResult() {
    setEvalResult(null);
    setShowOverrideInput(false);
    setOverrideMotivo('');
  }

  return (
    <div className="relative">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-slide-in ${
          toast.type === 'success'
            ? 'bg-estado-green text-white'
            : 'bg-estado-red text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Gate evaluation modal */}
      {evalResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={dismissEvalResult} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-200 px-5 py-4">
              <h3 className="text-sm font-bold text-red-800">Transición bloqueada</h3>
              <p className="text-xs text-red-600 mt-0.5">
                {obras.find(o => o.id === evalResult.obraId)?.codigo} →{' '}
                {KANBAN_COLUMNS.find(c => c.key === evalResult.to)?.label}
              </p>
            </div>

            {/* Failed gates */}
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

            {/* Override section */}
            {canOverride && !showOverrideInput && (
              <div className="px-5 pb-2">
                <button
                  onClick={() => setShowOverrideInput(true)}
                  className="w-full py-2.5 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  ⚠️ Forzar transición (override)
                </button>
              </div>
            )}

            {showOverrideInput && (
              <div className="px-5 pb-2 space-y-2">
                <textarea
                  value={overrideMotivo}
                  onChange={e => setOverrideMotivo(e.target.value)}
                  placeholder="Motivo obligatorio (mín. 10 caracteres)..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  autoFocus
                />
                <p className={`text-[10px] ${overrideMotivo.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  {overrideMotivo.trim().length}/10 caracteres mínimos
                </p>
                <button
                  onClick={() => executeTransition(evalResult.obraId, evalResult.to, true, overrideMotivo.trim())}
                  disabled={overrideMotivo.trim().length < 10 || executing}
                  className="w-full py-2.5 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors"
                >
                  {executing ? 'Procesando...' : '⚠️ Confirmar override'}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={dismissEvalResult}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluating overlay */}
      {evaluating && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-xl px-5 py-3 flex items-center gap-3 border border-auro-border">
          <div className="w-4 h-4 border-2 border-auro-orange/30 border-t-auro-orange rounded-full animate-spin" />
          <span className="text-sm font-medium text-auro-navy/70">Evaluando requisitos...</span>
        </div>
      )}

      {/* Kanban columns */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {KANBAN_COLUMNS.map(col => {
          const columnObras = obrasByEstado[col.key] || [];
          const isDragOver = dragOverColumn === col.key && draggedObra?.estado !== col.key;
          const isValidDrop = draggedObra && draggedObra.estado !== col.key;

          return (
            <div
              key={col.key}
              className="shrink-0 flex flex-col rounded-xl transition-all duration-200"
              style={{
                width: '260px',
                scrollSnapAlign: 'start',
                background: isDragOver ? col.bgLight : 'transparent',
                border: isDragOver ? `2px dashed ${col.color}` : '2px solid transparent',
              }}
              onDragOver={(e) => isValidDrop ? handleDragOver(e, col.key) : undefined}
              onDragLeave={handleDragLeave}
              onDrop={(e) => isValidDrop ? handleDrop(e, col.key) : undefined}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{col.icon}</span>
                  <span className="text-xs font-bold text-auro-navy/70 uppercase tracking-wide">
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: col.color,
                    background: col.bgLight,
                  }}
                >
                  {columnObras.length}
                </span>
              </div>

              {/* Cards container */}
              <div className="flex-1 space-y-2 px-1.5 pb-2 min-h-[80px]">
                {columnObras.map(obra => (
                  <KanbanCard
                    key={obra.id}
                    obra={obra}
                    color={col.color}
                    onClick={() => onObraClick(obra.id)}
                    onDragStart={(e) => handleDragStart(e, obra)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedObra?.id === obra.id}
                  />
                ))}

                {/* Empty state */}
                {columnObras.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-[10px] text-auro-navy/20 font-medium">Sin obras</p>
                  </div>
                )}

                {/* Drop zone indicator */}
                {isDragOver && (
                  <div
                    className="border-2 border-dashed rounded-lg py-4 text-center transition-all"
                    style={{ borderColor: col.color, background: col.bgLight }}
                  >
                    <p className="text-xs font-medium" style={{ color: col.color }}>
                      Soltar aquí
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll hint for mobile */}
      <div className="flex justify-center mt-2 gap-1 lg:hidden">
        {KANBAN_COLUMNS.map((col, i) => (
          <div
            key={col.key}
            className="w-1.5 h-1.5 rounded-full bg-auro-navy/10"
            title={col.label}
          />
        ))}
      </div>
    </div>
  );
}

// ── Kanban Card ──
function KanbanCard({
  obra,
  color,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  obra: KanbanObra;
  color: string;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
}) {
  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });
  const tipoIcon = TIPO_ICONS[obra.tipo] || '⚡';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white border border-auro-border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${
        isDragging ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5'
      }`}
      style={{
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Top row: code + type */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-auro-orange tabular-nums">{obra.codigo}</span>
        <span className="text-sm" title={obra.tipo}>{tipoIcon}</span>
      </div>

      {/* Client name */}
      <p className="text-xs font-semibold text-auro-navy truncate mb-1">
        {obra.cliente.nombre} {obra.cliente.apellidos}
      </p>

      {/* Location */}
      {obra.localidad && (
        <p className="text-[10px] text-auro-navy/40 truncate mb-2">
          📍 {obra.localidad}
        </p>
      )}

      {/* Bottom row: price + cobro + alerts */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-auro-navy">{euros}€</span>
        <div className="flex items-center gap-1.5">
          {obra._count.incidencias > 0 && (
            <span className="text-[9px] font-bold text-estado-red bg-estado-red/10 px-1.5 py-0.5 rounded-full">
              ⚠ {obra._count.incidencias}
            </span>
          )}
          {/* Cobro bar mini */}
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-auro-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  obra.porcentajeCobro >= 100 ? 'bg-estado-green' : obra.porcentajeCobro >= 50 ? 'bg-auro-orange' : 'bg-estado-red'
                }`}
                style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-medium text-auro-navy/30 tabular-nums">
              {obra.porcentajeCobro}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
