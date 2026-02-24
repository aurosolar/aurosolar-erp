// src/components/obras/ObraCard.tsx
'use client';

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = { REVISION_TECNICA: { label: 'Revisión técnica', color: 'text-estado-purple', bg: 'bg-estado-purple/10', dot: 'bg-estado-purple' }, PREPARANDO: { label: 'Preparando', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' }, PROGRAMADA: { label: 'Programada', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' }, INSTALANDO: { label: 'Instalando', color: 'text-auro-orange', bg: 'bg-auro-orange/10', dot: 'bg-auro-orange' }, TERMINADA: { label: 'Terminada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' }, INCIDENCIA: { label: 'Incidencia', color: 'text-estado-red', bg: 'bg-estado-red/10', dot: 'bg-estado-red' }, LEGALIZACION: { label: 'Legalización', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' }, LEGALIZADA: { label: 'Legalizada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' }, COMPLETADA: { label: 'Completada', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' }, CANCELADA: { label: 'Cancelada', color: 'text-auro-navy/30', bg: 'bg-auro-navy/5', dot: 'bg-auro-navy/30' } };

interface Props {
  obra: {
    id: string;
    codigo: string;
    tipo: string;
    estado: string;
    presupuestoTotal: number;
    porcentajeCobro: number;
    potenciaKwp: number | null;
    localidad: string | null;
    cliente: { nombre: string; apellidos: string };
    _count: { incidencias: number };
  };
  onClick: () => void;
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠',
  INDUSTRIAL: '🏭',
  AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋',
  AEROTERMIA: '🌡️',
  BESS: '⚡',
  BACKUP: '🔌',
};

export function ObraCard({ obra, onClick }: Props) {
  const estadoCfg = ESTADOS_CONFIG[obra.estado] || ESTADOS_CONFIG.REVISION_TECNICA;
  const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });

  return (
    <div
      onClick={onClick}
      className="bg-white border border-auro-border rounded-card p-4 shadow-sm active:bg-auro-surface-2 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TIPO_ICONS[obra.tipo] || '⚡'}</span>
          <div>
            <div className="text-[12px] font-bold text-auro-orange">{obra.codigo}</div>
            <div className="text-sm font-bold text-auro-navy">
              {obra.cliente.nombre} {obra.cliente.apellidos}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-badge ${estadoCfg.bg} ${estadoCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
          {estadoCfg.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-auro-navy/40 mb-3">
        {obra.localidad && <span>📍 {obra.localidad}</span>}
        {obra.potenciaKwp && <span>⚡ {obra.potenciaKwp} kWp</span>}
        {obra._count.incidencias > 0 && (
          <span className="text-estado-red font-bold">⚠️ {obra._count.incidencias}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-auro-navy">{euros}€</span>
        <div className="flex items-center gap-2 w-24">
          <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                obra.porcentajeCobro >= 100 ? 'bg-estado-green' : obra.porcentajeCobro >= 50 ? 'bg-auro-orange' : 'bg-estado-red'
              }`}
              style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-auro-navy/40 tabular-nums">
            {obra.porcentajeCobro}%
          </span>
        </div>
      </div>
    </div>
  );
}
