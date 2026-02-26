// src/components/obras/OverrideModal.tsx
// Modal de override: muestra gates saltados, exige motivo (mín 10 chars)

'use client';

import { useState, useRef, useEffect } from 'react';
import type { GateResult } from '@/services/gate-engine';

interface OverrideModalProps {
  open: boolean;
  from: string;
  to: string;
  gatesFallidos: GateResult[];
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const MIN_CHARS = 10;

export function OverrideModal({
  open,
  from,
  to,
  gatesFallidos,
  onConfirm,
  onCancel,
  loading = false,
}: OverrideModalProps) {
  const [motivo, setMotivo] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chars = motivo.trim().length;
  const isValid = chars >= MIN_CHARS;

  useEffect(() => {
    if (open) {
      setMotivo('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Override de transición</h3>
              <p className="text-xs text-amber-700">{from} → {to}</p>
            </div>
          </div>
        </div>

        {/* Gates saltados */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Requisitos que se van a saltar:
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {gatesFallidos.map((g) => (
              <div
                key={g.gate}
                className="flex items-start gap-2 bg-amber-50 rounded-md p-2 border border-amber-100"
              >
                <span className="text-amber-500 text-xs mt-0.5">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-800">{g.reason}</p>
                  <p className="text-[10px] text-amber-500 font-mono">{g.gate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivo */}
        <div className="px-4 pb-3 space-y-1.5">
          <label htmlFor="override-motivo" className="text-xs font-semibold text-gray-700">
            Motivo del override <span className="text-red-500">*</span>
          </label>
          <textarea
            id="override-motivo"
            ref={textareaRef}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique por qué se salta estos requisitos..."
            rows={3}
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <p className={`text-[10px] ${chars >= MIN_CHARS ? 'text-green-600' : 'text-gray-400'}`}>
              {chars}/{MIN_CHARS} caracteres mínimos
            </p>
            <p className="text-[10px] text-gray-400">
              Este motivo quedará registrado en la auditoría
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => isValid && onConfirm(motivo.trim())}
            disabled={!isValid || loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: '44px' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </span>
            ) : (
              '⚠️ Confirmar override'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
