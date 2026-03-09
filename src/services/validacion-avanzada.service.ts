// src/services/validacion-avanzada.service.ts
// ═══════════════════════════════════════════
// Guarda datos de validación técnica en ChecklistValidacion.
// SOLO guarda como BORRADOR. NO transiciona estado de obra.
// El envío para revisión es via /api/obras/[id]/checklist/[id]/submit
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import type { ResultadoValidacion } from '@prisma/client';
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
  let resultado: ResultadoValidacion;
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
        inversorReal: [marcaInversor, modeloInversor, potenciaInversor ? `${potenciaInversor}W` : null].filter(Boolean).join(" ") || null,


        bateriaReal: [marcaBateria, modeloBateria, capacidadBateria ? `${capacidadBateria}kWh` : null].filter(Boolean).join(" ") || null,


        observaciones: observacionesGenerales,
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
          pregunta: item.codigo,
          critico: item.critico,
          respuesta: item.respuesta,
          notas: item.observacion || null,
        },
        update: {
          respuesta: item.respuesta,
          notas: item.observacion || null,
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
        inversorReal: [marcaInversor, modeloInversor, potenciaInversor ? `${potenciaInversor}W` : null].filter(Boolean).join(" ") || null,
        bateriaReal: [marcaBateria, modeloBateria, capacidadBateria ? `${capacidadBateria}kWh` : null].filter(Boolean).join(" ") || null,
        observaciones: observacionesGenerales,
      items: {
        create: items.map(item => ({
          codigo: item.codigo,
          pregunta: item.codigo,
          critico: item.critico,
          respuesta: item.respuesta,
          notas: item.observacion || null,
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

// ── Exports de retrocompatibilidad (usados por rutas existentes) ──
export async function datosPreCarga(obraId: string) {
  const { prisma } = await import('@/lib/prisma');
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true, codigo: true, potenciaKwp: true, numPaneles: true,
      inversor: true, bateriaKwh: true, marcaPaneles: true, tipo: true,
      cliente: { select: { nombre: true, apellidos: true } },
    },
  });
  if (!obra) throw new Error('Obra no encontrada');
  const CHECKLIST_ITEMS = [
    { codigo: 'INV_ARRANCA', pregunta: 'Inversor arranca y produce', critico: true },
    { codigo: 'PRODUCCION_OK', pregunta: 'Producción instantánea verificada en app', critico: true },
    { codigo: 'MONITORIZACION', pregunta: 'Monitorización dada de alta', critico: true },
    { codigo: 'PROTECCIONES_AC', pregunta: 'Protecciones AC instaladas (MT + diferencial)', critico: true },
    { codigo: 'SPD_INSTALADO', pregunta: 'SPD instalado', critico: true },
    { codigo: 'FUSIBLES_DC', pregunta: 'Fusibles DC correctos (si aplica)', critico: false },
    { codigo: 'SMART_METER', pregunta: 'Smart meter instalado (si aplica)', critico: false },
    { codigo: 'BATERIA_COM', pregunta: 'Comunicación batería OK (si aplica)', critico: false },
    { codigo: 'BACKUP_EPS', pregunta: 'Test backup/EPS OK (si aplica)', critico: false },
    { codigo: 'SELLADO_CUBIERTA', pregunta: 'Sellado cubierta / anclajes OK', critico: true },
  ];
  return { ...obra, checklistItems: CHECKLIST_ITEMS, tienesBateria: (obra.bateriaKwh || 0) > 0 };
}

export async function detalle(id: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.checklistValidacion.findUnique({ where: { id }, include: { items: true } });
}

export async function listar(filtros?: { obraId?: string }) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.checklistValidacion.findMany({
    where: filtros?.obraId ? { obraId: filtros.obraId } : {},
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}
