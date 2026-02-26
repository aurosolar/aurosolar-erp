// src/components/obras/ChecklistReview.tsx
// Muestra el checklist de validación con acciones de revisión para coordinador
// Autónomo: hace sus propias llamadas API para aprobar/rechazar

'use client';

import { useState } from 'react';

interface ChecklistItem {
  codigo: string;
  critico: boolean;
  respuesta: string | null;
  label: string;
  observacion?: string | null;
  fotoUrl?: string | null;
}

interface ChecklistData {
  id: string;
  status: 'BORRADOR' | 'SUBMITIDA' | 'APROBADA' | 'RECHAZADA';
  resultado: 'OK' | 'OK_CON_OBS' | 'NO_OK' | 'BORRADOR';
  serialInversor: string | null;
  serialBateria: string | null;
  observacionesGenerales: string | null;
  submittedAt: string | null;
  submittedBy?: { nombre: string; apellidos: string } | null;
  reviewedAt: string | null;
  reviewedBy?: { nombre: string; apellidos: string } | null;
  reviewDecision: string | null;
  reviewNotes: string | null;
  items: ChecklistItem[];
}

interface ChecklistReviewProps {
  checklist: ChecklistData;
  obraId: string;
  canReview: boolean;
  onReviewComplete: () => void;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  BORRADOR:  { label: 'Borrador',  className: 'bg-gray-100 text-gray-700 border-gray-200' },
  SUBMITIDA: { label: 'Pendiente', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  APROBADA:  { label: 'Aprobada',  className: 'bg-green-100 text-green-700 border-green-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-100 text-red-700 border-red-200' },
};

const RESULTADO_BADGES: Record<string, { label: string; icon: string; className: string }> = {
  OK:         { label: 'OK',              icon: '✅', className: 'text-green-700' },
  OK_CON_OBS: { label: 'OK con observaciones', icon: '⚠️', className: 'text-amber-700' },
  NO_OK:      { label: 'No OK',           icon: '❌', className: 'text-red-700' },
  BORRADOR:   { label: 'Sin evaluar',     icon: '📝', className: 'text-gray-500' },
};

const MIN_REJECT_CHARS = 10;

export function ChecklistReview({
  checklist,
  obraId,
  canReview,
  onReviewComplete,
}: ChecklistReviewProps) {
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const status = STATUS_BADGES[checklist.status] || STATUS_BADGES.BORRADOR;
  const resultado = RESULTADO_BADGES[checklist.resultado] || RESULTADO_BADGES.BORRADOR;
  const criticalFails = checklist.items.filter(i => i.critico && i.respuesta === 'NO');
  const isRejectValid = rejectNotes.trim().length >= MIN_REJECT_CHARS;

  async function handleReview(decision: 'APROBADA' | 'RECHAZADA', notes?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/obras/${obraId}/checklist/${checklist.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowReject(false);
        setRejectNotes('');
        onReviewComplete();
      } else {
        setError(data.error || 'Error al procesar revisión');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con status */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Validación técnica</h3>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Resultado técnico */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
        <span className="text-lg">{resultado.icon}</span>
        <div>
          <p className={`text-sm font-semibold ${resultado.className}`}>
            Resultado: {resultado.label}
          </p>
          {criticalFails.length > 0 && (
            <p className="text-xs text-red-500 mt-0.5">
              {criticalFails.length} ítem(s) crítico(s) fallido(s)
            </p>
          )}
        </div>
      </div>

      {/* Seriales */}
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Serial inversor" value={checklist.serialInversor} />
        <InfoField label="Serial batería" value={checklist.serialBateria} />
      </div>

      {/* Items */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Ítems de validación ({checklist.items.length})
        </p>
        <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-gray-200">
          {checklist.items.map((item) => (
            <ItemRow key={item.codigo} item={item} />
          ))}
        </div>
      </div>

      {/* Observaciones generales */}
      {checklist.observacionesGenerales && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Observaciones generales</p>
          <p className="text-sm text-gray-800">{checklist.observacionesGenerales}</p>
        </div>
      )}

      {/* Info de submit */}
      {checklist.submittedAt && (
        <div className="text-xs text-gray-500">
          Enviado el {new Date(checklist.submittedAt).toLocaleString('es-ES')}
          {checklist.submittedBy && (
            <> por {checklist.submittedBy.nombre} {checklist.submittedBy.apellidos}</>
          )}
        </div>
      )}

      {/* Info de revisión anterior */}
      {checklist.reviewedAt && (
        <div className={`rounded-lg p-3 ${
          checklist.reviewDecision === 'APROBADA' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className="text-xs font-semibold text-gray-600 mb-1">
            Revisión {checklist.reviewDecision === 'APROBADA' ? 'aprobada' : 'rechazada'} el{' '}
            {new Date(checklist.reviewedAt).toLocaleString('es-ES')}
            {checklist.reviewedBy && (
              <> por {checklist.reviewedBy.nombre} {checklist.reviewedBy.apellidos}</>
            )}
          </p>
          {checklist.reviewNotes && (
            <p className="text-sm text-gray-800 mt-1">{checklist.reviewNotes}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Acciones de revisión (solo si SUBMITIDA y tiene permisos) */}
      {canReview && checklist.status === 'SUBMITIDA' && (
        <div className="pt-3 border-t border-gray-200 space-y-3">
          {!showReject ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleReview('APROBADA')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                style={{ minHeight: '44px' }}
              >
                {loading ? 'Procesando...' : '✅ Aprobar'}
              </button>
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                style={{ minHeight: '44px' }}
              >
                ❌ Rechazar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="reject-notes" className="text-xs font-semibold text-gray-700">
                Motivo del rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Describa qué debe corregir el instalador..."
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <p className={`text-[10px] ${
                  rejectNotes.trim().length >= MIN_REJECT_CHARS ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {rejectNotes.trim().length}/{MIN_REJECT_CHARS} caracteres mínimos
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowReject(false); setRejectNotes(''); }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => isRejectValid && handleReview('RECHAZADA', rejectNotes.trim())}
                  disabled={!isRejectValid || loading}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  {loading ? 'Procesando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ──

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-400 font-medium uppercase">{label}</p>
      <p className={`text-sm mt-0.5 ${value ? 'text-gray-900 font-mono' : 'text-gray-400 italic'}`}>
        {value || 'No registrado'}
      </p>
    </div>
  );
}

function ItemRow({ item }: { item: ChecklistItem }) {
  const icon = item.respuesta === 'SI' ? '✅'
    : item.respuesta === 'NO' ? '❌'
    : item.respuesta === 'NA' ? '➖'
    : item.respuesta === 'OBSERVACION' ? '⚠️'
    : '⬜';

  return (
    <div className={`flex items-start gap-2 px-3 py-2 ${
      item.critico && item.respuesta === 'NO' ? 'bg-red-50' : 'hover:bg-gray-50'
    }`}>
      <span className="text-sm mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.critico ? 'font-semibold' : ''} ${
          item.critico && item.respuesta === 'NO' ? 'text-red-800' : 'text-gray-800'
        }`}>
          {item.label || item.codigo}
          {item.critico && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded">
              CRÍTICO
            </span>
          )}
        </p>
        {item.observacion && (
          <p className="text-xs text-gray-500 mt-0.5">{item.observacion}</p>
        )}
      </div>
    </div>
  );
}
