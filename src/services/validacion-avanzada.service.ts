// src/services/validacion-avanzada.service.ts
// ═══════════════════════════════════════════
// Guarda datos de validación técnica en ChecklistValidacion.
// SOLO guarda como BORRADOR. NO transiciona estado de obra.
// El envío para revisión es via /api/obras/[id]/checklist/[id]/submit
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface ItemValidacion {
  codigo: string;
  critico: boolean;
  respuesta: 'SI' | 'NO' | 'NA' | 'OBSERVACION' | null;
  observacion?: string;
  fotoUrl?: string;
}

interface DatosValidacion {
  obraId: string;
  usuarioId: string;
  items: ItemValidacion[];
  serialInversor?: string | null;
  serialBateria?: string | null;
  marcaInversor?: string | null;
  modeloInversor?: string | null;
  potenciaInversor?: number | null;
  marcaBateria?: string | null;
  modeloBateria?: string | null;
  capacidadBateria?: number | null;
  observacionesGenerales?: string | null;
}

export async function guardarValidacion(datos: DatosValidacion) {
  const {
    obraId, usuarioId, items,
    serialInversor, serialBateria,
    marcaInversor, modeloInversor, potenciaInversor,
    marcaBateria, modeloBateria, capacidadBateria,
    observacionesGenerales,
  } = datos;

  // Buscar checklist existente (BORRADOR o RECHAZADA se puede editar)
  const existente = await prisma.checklistValidacion.findFirst({
    where: {
      obraId,
      status: { in: ['BORRADOR', 'RECHAZADA'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Auto-calcular resultado basándose en ítems
  const criticosFallidos = items.filter(i => i.critico && i.respuesta === 'NO');
  const conObservaciones = items.some(i => i.respuesta === 'OBSERVACION');
  let resultado: string;
  if (criticosFallidos.length > 0) resultado = 'NO_OK';
  else if (conObservaciones) resultado = 'OK_CON_OBS';
  else resultado = 'OK';

  if (existente) {
    // Actualizar checklist existente (mantener como BORRADOR)
    const updated = await prisma.checklistValidacion.update({
      where: { id: existente.id },
      data: {
        // Siempre volver a BORRADOR al editar
        status: 'BORRADOR',
        resultado,
        serialInversor,
        serialBateria,
        marcaInversor,
        modeloInversor,
        potenciaInversor,
        marcaBateria,
        modeloBateria,
        capacidadBateria,
        observacionesGenerales,
        // Reset de review (si venía de RECHAZADA)
        reviewedAt: null,
        reviewedById: null,
        reviewDecision: null,
        reviewNotes: null,
        // Reset de submit
        submittedAt: null,
        submittedById: null,
      },
    });

    // Upsert ítems
    for (const item of items) {
      await prisma.checklistItem.upsert({
        where: {
          checklistId_codigo: {
            checklistId: existente.id,
            codigo: item.codigo,
          },
        },
        create: {
          checklistId: existente.id,
          codigo: item.codigo,
          critico: item.critico,
          respuesta: item.respuesta,
          observacion: item.observacion || null,
          fotoUrl: item.fotoUrl || null,
        },
        update: {
          respuesta: item.respuesta,
          observacion: item.observacion || null,
          fotoUrl: item.fotoUrl || null,
        },
      });
    }

    logger.info('validacion_guardada', {
      obraId, checklistId: existente.id, resultado, modo: 'update',
    });

    return { checklist: updated, isNew: false };
  }

  // Crear nuevo checklist como BORRADOR
  const nuevo = await prisma.checklistValidacion.create({
    data: {
      obraId,
      creadoPorId: usuarioId,
      status: 'BORRADOR',
      resultado,
      serialInversor,
      serialBateria,
      marcaInversor,
      modeloInversor,
      potenciaInversor,
      marcaBateria,
      modeloBateria,
      capacidadBateria,
      observacionesGenerales,
      items: {
        create: items.map(item => ({
          codigo: item.codigo,
          critico: item.critico,
          respuesta: item.respuesta,
          observacion: item.observacion || null,
          fotoUrl: item.fotoUrl || null,
        })),
      },
    },
    include: { items: true },
  });

  // Auditoría
  await prisma.actividad.create({
    data: {
      obraId,
      usuarioId,
      accion: 'CHECKLIST_CREADA',
      entidad: 'checklistValidacion',
      entidadId: nuevo.id,
      detalle: JSON.stringify({
        resultado, totalItems: items.length,
        criticosFallidos: criticosFallidos.length,
      }),
    },
  });

  logger.info('validacion_guardada', {
    obraId, checklistId: nuevo.id, resultado, modo: 'create',
  });

  return { checklist: nuevo, isNew: true };
}
