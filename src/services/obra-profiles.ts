// src/services/obra-profiles.ts
// ═══════════════════════════════════════════════════════════
// PERFILES DE OBRA — Config por tipo de instalación
// Define qué gates se saltan según el perfil de la obra.
//
// 3 perfiles:
//   ESTANDAR   → Todos los gates (residencial, industrial normal)
//   ALQUILER   → Sin documentación pesada (alquiler de cubierta)
//   REPARACION → Gates mínimos (reparación, sustitución equipos)
// ═══════════════════════════════════════════════════════════

import type { TipoInstalacion } from '@prisma/client';

export type PerfilObra = 'ESTANDAR' | 'ALQUILER' | 'REPARACION';

// Mapeo: tipo de instalación → perfil por defecto
// (se puede override por obra individual en el futuro)
export const PERFIL_POR_TIPO: Record<string, PerfilObra> = {
  RESIDENCIAL:     'ESTANDAR',
  INDUSTRIAL:      'ESTANDAR',
  AGROINDUSTRIAL:  'ESTANDAR',
  BATERIA:         'ESTANDAR',
  AEROTERMIA:      'ESTANDAR',
  // Estos se pueden añadir al enum TipoInstalacion:
  ALQUILER_CUBIERTA: 'ALQUILER',
  REPARACION:        'REPARACION',
  SUSTITUCION:       'REPARACION',
};

// Gates que se SALTAN por perfil
// Si un gate está en esta lista, se considera automáticamente passed
export const GATES_SKIP_POR_PERFIL: Record<PerfilObra, string[]> = {
  ESTANDAR: [],  // No se salta nada

  ALQUILER: [
    'DOCS_MINIMOS',           // No requiere presupuesto/contrato propio
    'ACTIVOS_REGISTRADOS',    // Activos son del cliente
    'CHECKLIST_SUBMITIDA',    // Checklist simplificado
    'ITEMS_CRITICOS_OK',      // Sin ítems críticos
    'SERIAL_INVERSOR',        // No siempre instalamos inversor
  ],

  REPARACION: [
    'DOCS_MINIMOS',
    'ACTIVOS_REGISTRADOS',
    'CHECKLIST_SUBMITIDA',
    'CHECKLIST_APROBADA',
    'ITEMS_CRITICOS_OK',
    'SERIAL_INVERSOR',
    'FOTOS_MINIMAS',
    'HITOS_PAGO_LEGALIZACION',
    'HITOS_PAGO_COMPLETADA',
    'EXPEDIENTE_O_ESTADO_LEGAL',
    // Reparaciones van: REVISION → PREPARANDO → PROGRAMADA → INSTALANDO → COMPLETADA
    // Saltan legalización
  ],
};

export function getPerfilObra(tipo: string, perfilOverride?: PerfilObra | null): PerfilObra {
  if (perfilOverride) return perfilOverride;
  return PERFIL_POR_TIPO[tipo] || 'ESTANDAR';
}

export function shouldSkipGate(perfil: PerfilObra, gateId: string): boolean {
  return GATES_SKIP_POR_PERFIL[perfil].includes(gateId);
}
