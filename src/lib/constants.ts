export const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  REVISION_TECNICA: { label: 'Revisión técnica', color: 'text-estado-blue', bg: 'bg-estado-blue/10', dot: 'bg-estado-blue' },
  PREPARANDO: { label: 'Preparando', color: 'text-estado-purple', bg: 'bg-estado-purple/10', dot: 'bg-estado-purple' },
  PENDIENTE_MATERIAL: { label: 'Pte. material', color: 'text-estado-amber', bg: 'bg-estado-amber/10', dot: 'bg-estado-amber' },
  PROGRAMADA: { label: 'Programada', color: 'text-auro-orange', bg: 'bg-auro-orange/10', dot: 'bg-auro-orange' },
  INSTALANDO: { label: 'Instalando', color: 'text-estado-green', bg: 'bg-estado-green/10', dot: 'bg-estado-green' },
  INCIDENCIA: { label: 'Incidencia', color: 'text-estado-red', bg: 'bg-estado-red/10', dot: 'bg-estado-red' },
  LEGALIZACION: { label: 'Legalización', color: 'text-yellow-400', bg: 'bg-yellow-400/10', dot: 'bg-yellow-400' },
  LEGALIZADA: { label: 'Legalizada', color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  COMPLETADA: { label: 'Completada', color: 'text-green-300', bg: 'bg-green-300/10', dot: 'bg-green-300' },
  CANCELADA: { label: 'Cancelada', color: 'text-auro-navy/40', bg: 'bg-auro-navy/5', dot: 'bg-auro-navy/30' },
};
