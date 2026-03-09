// src/components/incidencias/GestionIncidenciaModal.tsx
'use client';
import { useState, useEffect } from 'react';

interface Incidencia {
  id: string;
  gravedad: string;
  estado: string;
  descripcion: string;
  categoria: string | null;
  fotoUrl: string | null;
  notasResolucion: string | null;
  slaHoras: number | null;
  createdAt: string;
  fechaResolucion: string | null;
  creadoPor?: { nombre: string; apellidos?: string } | null;
  asignadoA?: { id: string; nombre: string; apellidos?: string } | null;
}

interface Props {
  incidencia: Incidencia;
  onUpdated: () => void;
  onClose: () => void;
}

const ESTADOS_FLOW: Record<string, string[]> = {
  ABIERTA: ['EN_PROCESO', 'RESUELTA'],
  EN_PROCESO: ['RESUELTA', 'ABIERTA'],
  RESUELTA: ['CERRADA', 'ABIERTA'],
  CERRADA: [],
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ABIERTA: { label: 'Abierta', color: 'text-red-600', bg: 'bg-red-100' },
  EN_PROCESO: { label: 'En proceso', color: 'text-amber-600', bg: 'bg-amber-100' },
  RESUELTA: { label: 'Resuelta', color: 'text-green-600', bg: 'bg-green-100' },
  CERRADA: { label: 'Cerrada', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export function GestionIncidenciaModal({ incidencia, onUpdated, onClose }: Props) {
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [notas, setNotas] = useState(incidencia.notasResolucion || '');
  const [asignadoAId, setAsignadoAId] = useState(incidencia.asignadoA?.id || '');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nombre: string; apellidos: string }>>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/usuarios').then(r => r.json()).then(d => {
      if (d.ok) setUsuarios(d.data || []);
    }).catch(() => {});
  }, []);

  const transiciones = ESTADOS_FLOW[incidencia.estado] || [];
  const estadoConfig = ESTADO_CONFIG[incidencia.estado] || { label: incidencia.estado, color: '', bg: '' };

  // SLA
  const slaMs = (incidencia.slaHoras || 48) * 3600000;
  const elapsed = Date.now() - new Date(incidencia.createdAt).getTime();
  const slaPercent = Math.min(100, Math.round((elapsed / slaMs) * 100));
  const slaExceeded = elapsed > slaMs;

  async function cambiarEstado(estado: string) {
    if (estado === 'RESUELTA' && notas.trim().length < 5) {
      setError('Se requiere nota de resolución (mín. 5 caracteres)');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const body: any = { estado };
      if (notas.trim()) body.notasResolucion = notas.trim();
      if (asignadoAId) body.asignadoAId = asignadoAId;
      const res = await fetch(`/api/incidencias/${incidencia.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdated();
      } else {
        setError(data.error || 'Error');
      }
    } catch (e) {
      setError('Error de conexión');
    }
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-auro-border">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${estadoConfig.bg} ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              incidencia.gravedad === 'CRITICA' ? 'bg-red-100 text-red-700' :
              incidencia.gravedad === 'ALTA' ? 'bg-amber-100 text-amber-700' :
              incidencia.gravedad === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>{incidencia.gravedad}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-auro-surface-2 text-auro-navy/40">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Descripción */}
          <div>
            <p className="text-sm text-auro-navy">{incidencia.descripcion}</p>
            {incidencia.categoria && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-auro-surface-2 rounded text-[10px] text-auro-navy/50 font-semibold">
                {incidencia.categoria}
              </span>
            )}
          </div>

          {/* SLA */}
          <div className="bg-auro-surface-2 rounded-lg p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-auro-navy/50">SLA {incidencia.slaHoras || 48}h</span>
              <span className={slaExceeded ? 'text-red-600 font-bold' : 'text-auro-navy/50'}>
                {slaExceeded ? '⚠️ SLA superado' : `${slaPercent}%`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-auro-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${slaExceeded ? 'bg-red-500' : slaPercent > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, slaPercent)}%` }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-auro-navy/40">Creada por</span>
              <p className="font-semibold text-auro-navy">{incidencia.creadoPor?.nombre || '—'}</p>
            </div>
            <div>
              <span className="text-auro-navy/40">Fecha</span>
              <p className="font-semibold text-auro-navy">{new Date(incidencia.createdAt).toLocaleDateString('es-ES')}</p>
            </div>
            {incidencia.fechaResolucion && (
              <div>
                <span className="text-auro-navy/40">Resuelta</span>
                <p className="font-semibold text-auro-navy">{new Date(incidencia.fechaResolucion).toLocaleDateString('es-ES')}</p>
              </div>
            )}
          </div>

          {/* Asignar */}
          {incidencia.estado !== 'CERRADA' && (
            <div>
              <label className="text-xs font-semibold text-auro-navy/50 uppercase tracking-wider mb-1 block">Asignar a</label>
              <select
                value={asignadoAId}
                onChange={e => setAsignadoAId(e.target.value)}
                className="w-full h-9 px-3 bg-auro-surface-2 border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40"
              >
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-auro-navy/50 uppercase tracking-wider mb-1 block">
              Notas{transiciones.includes('RESUELTA') ? ' de resolución' : ''}
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas, acciones tomadas, solución aplicada..."
              rows={3}
              className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40 resize-none"
              disabled={incidencia.estado === 'CERRADA'}
            />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        </div>

        {/* Acciones */}
        {transiciones.length > 0 && (
          <div className="flex justify-end gap-2 p-4 border-t border-auro-border">
            {transiciones.map(est => {
              const cfg = ESTADO_CONFIG[est];
              return (
                <button
                  key={est}
                  onClick={() => cambiarEstado(est)}
                  disabled={guardando}
                  className={`h-9 px-4 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 ${
                    est === 'RESUELTA' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    est === 'CERRADA' ? 'bg-gray-600 hover:bg-gray-700 text-white' :
                    est === 'EN_PROCESO' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                    'bg-auro-surface-2 hover:bg-auro-surface-3 text-auro-navy'
                  }`}
                >
                  {guardando ? '...' : `→ ${cfg?.label || est}`}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
