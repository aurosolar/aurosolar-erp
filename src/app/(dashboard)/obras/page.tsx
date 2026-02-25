// src/app/(dashboard)/obras/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ObraCard } from '@/components/obras/ObraCard';
import { ObraDetalle } from '@/components/obras/ObraDetalle';
import { FiltrosObras } from '@/components/obras/FiltrosObras';
import { NuevaObraModal } from '@/components/obras/NuevaObraModal';

interface Obra {
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

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  REVISION_TECNICA: { label: 'Revisión', color: 'text-estado-purple', bg: 'bg-estado-purple/10', dot: 'bg-estado-purple' },
  PREPARANDO: { label: 'Preparando', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PENDIENTE_MATERIAL: { label: 'Pte. Material', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PROGRAMADA: { label: 'Programada', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  INSTALANDO: { label: 'Instalando', color: 'text-auro-orange', bg: 'bg-auro-orange/10', dot: 'bg-auro-orange animate-pulse' },
  TERMINADA: { label: 'Terminada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  INCIDENCIA: { label: 'Incidencia', color: 'text-estado-red', bg: 'bg-estado-red/10', dot: 'bg-estado-red animate-pulse' },
  LEGALIZACION: { label: 'Legalización', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  LEGALIZADA: { label: 'Legalizada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  COMPLETADA: { label: 'Completada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  CANCELADA: { label: 'Cancelada', color: 'text-auro-navy/40', bg: 'bg-auro-navy/5', dot: 'bg-auro-navy/30' },
};

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [obraSeleccionada, setObraSeleccionada] = useState<string | null>(null);
  const [mostrarNueva, setMostrarNueva] = useState(false);

  const cargarObras = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (busqueda) params.set('q', busqueda);

    try {
      const res = await fetch(`/api/obras?${params}`);
      const data = await res.json();
      if (data.ok) {
        setObras(data.data.obras);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Error cargando obras:', error);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, busqueda]);

  useEffect(() => {
    cargarObras();
  }, [cargarObras]);

  // Contadores por estado
  const contadores = obras.reduce((acc, obra) => {
    acc[obra.estado] = (acc[obra.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-auro-navy">Obras</h2>
          <p className="text-sm text-auro-navy/40 mt-0.5">
            {total} obra{total !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <button
          onClick={() => setMostrarNueva(true)}
          className="h-10 px-5 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors shadow-sm shadow-auro-orange/20 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Nueva obra
        </button>
      </div>

      {/* Contadores por estado */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setFiltroEstado('')}
          className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors
            ${!filtroEstado
              ? 'bg-auro-navy text-white border-auro-navy'
              : 'bg-white text-auro-navy/50 border-auro-border hover:border-auro-navy/20'
            }`}
        >
          Todas · {total}
        </button>
        {Object.entries(ESTADOS_CONFIG).map(([key, config]) => {
          const count = contadores[key] || 0;
          if (count === 0 && !filtroEstado) return null;
          return (
            <button
              key={key}
              onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5
                ${filtroEstado === key
                  ? `${config.bg} ${config.color} border-current/20`
                  : 'bg-white text-auro-navy/50 border-auro-border hover:border-auro-navy/20'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label} · {count}
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-auro-navy/30">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o cliente..."
            className="w-full sm:w-80 h-10 pl-9 pr-4 bg-white border border-auro-border rounded-input text-sm placeholder-auro-navy/30 focus:outline-none focus:border-auro-orange/40 transition-colors"
          />
        </div>
      </div>

      {/* Tabla de obras (escritorio) */}
      {loading ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-auro-navy/40 font-medium">Cargando obras...</p>
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-auro-navy/50 font-medium">No se encontraron obras</p>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="text-xs text-auro-orange font-semibold mt-2 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vista tabla (escritorio) */}
          <div className="hidden lg:block bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-auro-surface-2">
                  {['Código', 'Cliente', 'Localidad', 'Tipo', 'Estado', 'Total', 'Cobro'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => {
                  const estadoCfg = ESTADOS_CONFIG[obra.estado] || ESTADOS_CONFIG.REVISION_TECNICA;
                  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });
                  return (
                    <tr
                      key={obra.id}
                      onClick={() => setObraSeleccionada(obra.id)}
                      className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-bold text-auro-orange tabular-nums">
                          {obra.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-auro-navy truncate max-w-[180px]">
                          {obra.cliente.nombre} {obra.cliente.apellidos}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-auro-navy/50">
                        {obra.localidad || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-auro-navy/50 font-medium">
                        {obra.tipo === 'RESIDENCIAL' ? '🏠' : obra.tipo === 'INDUSTRIAL' ? '🏭' : '🌾'}{' '}
                        {obra.tipo.charAt(0) + obra.tipo.slice(1).toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-badge ${estadoCfg.bg} ${estadoCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                          {estadoCfg.label}
                        </span>
                        {obra._count.incidencias > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-estado-red bg-estado-red/10 px-1.5 py-0.5 rounded-full">
                            {obra._count.incidencias}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-auro-navy text-right tabular-nums">
                        {euros}€
                      </td>
                      <td className="px-4 py-3 w-28">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                obra.porcentajeCobro >= 100
                                  ? 'bg-estado-green'
                                  : obra.porcentajeCobro >= 50
                                  ? 'bg-auro-orange'
                                  : 'bg-estado-red'
                              }`}
                              style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-auro-navy/40 tabular-nums w-8 text-right">
                            {obra.porcentajeCobro}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista cards (móvil) */}
          <div className="lg:hidden space-y-3">
            {obras.map((obra) => (
              <ObraCard
                key={obra.id}
                obra={obra}
                onClick={() => setObraSeleccionada(obra.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal detalle de obra */}
      {obraSeleccionada && (
        <ObraDetalle
          obraId={obraSeleccionada}
          onClose={() => setObraSeleccionada(null)}
          onUpdate={cargarObras}
        />
      )}

      {/* Modal nueva obra */}
      {mostrarNueva && (
        <NuevaObraModal
          onClose={() => setMostrarNueva(false)}
          onCreated={() => {
            setMostrarNueva(false);
            cargarObras();
          }}
        />
      )}
    </div>
  );
}
