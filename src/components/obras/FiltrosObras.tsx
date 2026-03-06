// src/components/obras/FiltrosObras.tsx
'use client';

interface FiltrosObrasProps {
  filtros: {
    estado: string;
    tipo: string;
    busqueda: string;
  };
  onChange: (filtros: { estado: string; tipo: string; busqueda: string }) => void;
  contadores?: Record<string, number>;
}

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'REVISION_TECNICA', label: '🔍 Revisión técnica' },
  { value: 'PREPARANDO', label: '📋 Preparando' },
  { value: 'PENDIENTE_MATERIAL', label: '📦 Pte. Material' },
  { value: 'PROGRAMADA', label: '📅 Programada' },
  { value: 'INSTALANDO', label: '⚡ Instalando' },
  { value: 'VALIDACION_OPERATIVA', label: '🔎 Validación operativa' },
  { value: 'REVISION_COORDINADOR', label: '👁️ Revisión coordinador' },
  { value: 'LEGALIZACION', label: '📋 Legalización' },
  { value: 'LEGALIZADA', label: '✅ Legalizada' },
  { value: 'COMPLETADA', label: '🏁 Completada' },
  { value: 'CANCELADA', label: '❌ Cancelada' },
];

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'RESIDENCIAL', label: '🏠 Residencial' },
  { value: 'INDUSTRIAL', label: '🏭 Industrial' },
  { value: 'AGROINDUSTRIAL', label: '🌾 Agroindustrial' },
  { value: 'BATERIA', label: '🔋 Batería' },
  { value: 'AEROTERMIA', label: '🌡️ Aerotermia' },
  { value: 'BESS', label: '🔋 BESS' },
  { value: 'BACKUP', label: '⚡ Backup' },
  { value: 'ALQUILER_CUBIERTA', label: '🏭 Alquiler cubierta' },
  { value: 'REPARACION', label: '🔧 Reparación' },
  { value: 'SUSTITUCION', label: '🔄 Sustitución' },
];

export function FiltrosObras({ filtros, onChange, contadores }: FiltrosObrasProps) {
  const update = (key: string, value: string) => {
    onChange({ ...filtros, [key]: value });
  };

  const activos = [filtros.estado, filtros.tipo, filtros.busqueda].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Búsqueda */}
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          value={filtros.busqueda}
          onChange={(e) => update('busqueda', e.target.value)}
          placeholder="Buscar código, cliente, localidad..."
          className="w-full h-9 pl-8 pr-3 bg-white border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40 transition-colors"
        />
        <span className="absolute left-2.5 top-2 text-auro-navy/30 text-sm">🔍</span>
      </div>

      {/* Estado */}
      <select
        value={filtros.estado}
        onChange={(e) => update('estado', e.target.value)}
        className="h-9 px-3 bg-white border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40"
      >
        {ESTADOS.map(e => (
          <option key={e.value} value={e.value}>
            {e.label}{contadores && e.value && contadores[e.value] ? ` (${contadores[e.value]})` : ''}
          </option>
        ))}
      </select>

      {/* Tipo */}
      <select
        value={filtros.tipo}
        onChange={(e) => update('tipo', e.target.value)}
        className="h-9 px-3 bg-white border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40"
      >
        {TIPOS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Limpiar */}
      {activos > 0 && (
        <button
          onClick={() => onChange({ estado: '', tipo: '', busqueda: '' })}
          className="h-9 px-3 text-xs text-auro-navy/40 hover:text-auro-orange transition-colors"
        >
          Limpiar ({activos})
        </button>
      )}
    </div>
  );
}
