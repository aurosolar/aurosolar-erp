// src/components/obras/GateBlocker.tsx
// Muestra gates fallidos con acciones sugeridas y botón de override

'use client';

import { useState } from 'react';
import type { TransitionResult, GateResult, SuggestedAction } from '@/services/gate-engine';

interface GateBlockerProps {
  result: TransitionResult;
  from: string;
  to: string;
  canOverride: boolean;
  onOverride: () => void;
  onAction?: (action: SuggestedAction) => void;
}

export function GateBlocker({
  result,
  from,
  to,
  canOverride,
  onOverride,
  onAction,
}: GateBlockerProps) {
  const [expanded, setExpanded] = useState(false);
  const failed = result.gates.filter(g => !g.passed);
  const passed = result.gates.filter(g => g.passed);

  if (failed.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-red-800">
            Transición bloqueada
          </h4>
          <p className="text-xs text-red-600 mt-0.5">
            {from} → {to} · {failed.length} requisito{failed.length > 1 ? 's' : ''} pendiente{failed.length > 1 ? 's' : ''}
          </p>
        </div>
        {passed.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-red-500 underline"
          >
            {expanded ? 'Ocultar' : `+${passed.length} cumplido${passed.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Gates fallidos */}
      <div className="space-y-2">
        {failed.map((g) => (
          <GateCard key={g.gate} gate={g} onAction={onAction} />
        ))}
      </div>

      {/* Gates cumplidos (expandible) */}
      {expanded && passed.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-red-200">
          <p className="text-xs text-green-700 font-medium mb-1">Requisitos cumplidos:</p>
          {passed.map((g) => (
            <div key={g.gate} className="flex items-center gap-2 text-xs text-green-700">
              <span>✅</span>
              <span className="font-mono">{g.gate}</span>
            </div>
          ))}
        </div>
      )}

      {/* Override */}
      {canOverride && (
        <div className="pt-2 border-t border-red-200">
          <button
            type="button"
            onClick={onOverride}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 active:bg-amber-300 transition-colors"
            style={{ minHeight: '44px' }}
          >
            <span>⚠️</span>
            Forzar transición (override)
          </button>
          <p className="text-[10px] text-red-500 text-center mt-1">
            Quedará registrado en auditoría
          </p>
        </div>
      )}
    </div>
  );
}

function GateCard({
  gate,
  onAction,
}: {
  gate: GateResult;
  onAction?: (action: SuggestedAction) => void;
}) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-md border border-red-100 p-3">
      <span className="text-red-500 mt-0.5 shrink-0">❌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800 font-medium">{gate.reason}</p>
        <p className="text-[10px] text-red-400 font-mono mt-0.5">{gate.gate}</p>
      </div>
      {gate.action && gate.action.type !== 'INFO' && onAction && (
        <button
          type="button"
          onClick={() => onAction(gate.action!)}
          className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 active:bg-blue-200 transition-colors"
          style={{ minHeight: '44px' }}
        >
          {gate.action.label}
        </button>
      )}
    </div>
  );
}
