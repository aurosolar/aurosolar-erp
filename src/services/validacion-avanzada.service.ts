// src/services/validacion-avanzada.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Ítems del checklist con indicador crítico
export const CHECKLIST_ITEMS = [
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

// ── Obtener datos pre-cargados de la obra ──
export async function datosPreCarga(obraId: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true, codigo: true, potenciaKwp: true, numPaneles: true,
      inversor: true, bateriaKwh: true, marcaPaneles: true, tipo: true,
      cliente: { select: { nombre: true, apellidos: true } },
    },
  });
  if (!obra) throw new Error('Obra no encontrada');
  return {
    ...obra,
    checklistItems: CHECKLIST_ITEMS,
    tienesBateria: (obra.bateriaKwh || 0) > 0,
  };
}

// ── Crear o actualizar validación ──
export async function guardarValidacion(input: {
  obraId: string;
  resultado: string;
  panelConfirmado: boolean;
  kWpReal?: number;
  panelesReal?: number;
  inversorReal?: string;
  bateriaReal?: string;
  estructuraReal?: string;
  serialInversor?: string;
  serialBateria?: string;
  serialSmartMeter?: string;
  observaciones?: string;
  fotosJson?: string;
  items: Array<{ codigo: string; respuesta: string; notas?: string }>;
}, usuarioId: string) {
  // Check si hay items críticos en NO
  const criticos = CHECKLIST_ITEMS.filter(i => i.critico);
  const criticosFallidos = input.items.filter(i => {
    const def = criticos.find(c => c.codigo === i.codigo);
    return def && i.respuesta === 'NO';
  });

  // Auto-determinar resultado si no se fuerza
  let resultado = input.resultado;
  if (criticosFallidos.length > 0 && resultado === 'OK') {
    resultado = 'NO_OK';
  }

  const checklist = await prisma.checklistValidacion.create({
    data: {
      obraId: input.obraId,
      resultado: resultado as any,
      panelConfirmado: input.panelConfirmado,
      kWpReal: input.kWpReal,
      panelesReal: input.panelesReal,
      inversorReal: input.inversorReal,
      bateriaReal: input.bateriaReal,
      estructuraReal: input.estructuraReal,
      serialInversor: input.serialInversor,
      serialBateria: input.serialBateria,
      serialSmartMeter: input.serialSmartMeter,
      observaciones: input.observaciones,
      fotosJson: input.fotosJson,
      creadoPorId: usuarioId,
      items: {
        create: input.items.map(i => {
          const def = CHECKLIST_ITEMS.find(d => d.codigo === i.codigo);
          return {
            codigo: i.codigo,
            pregunta: def?.pregunta || i.codigo,
            critico: def?.critico || false,
            respuesta: i.respuesta,
            notas: i.notas,
          };
        }),
      },
    },
  });

  // Si resultado OK → cambiar estado obra + crear activos
  if (resultado === 'OK' || resultado === 'OK_CON_OBS') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: { estado: 'TERMINADA' },
    });

    // Crear activos instalados con seriales
    const obra = await prisma.obra.findUnique({
      where: { id: input.obraId },
      select: { clienteId: true, inversor: true, marcaPaneles: true, bateriaKwh: true },
    });

    if (obra) {
      // Inversor
      if (input.serialInversor) {
        await prisma.activoInstalado.create({
          data: {
            obraId: input.obraId,
            tipo: 'INVERSOR',
            marca: (input.inversorReal || obra.inversor || '').split(' ')[0],
            modelo: input.inversorReal || obra.inversor || '',
            numeroSerie: input.serialInversor,
            garantiaAnios: 10,
            garantiaHasta: new Date(Date.now() + 10 * 365.25 * 24 * 3600000),
          },
        });
      }

      // Batería
      if (input.serialBateria && (obra.bateriaKwh || 0) > 0) {
        await prisma.activoInstalado.create({
          data: {
            obraId: input.obraId,
            tipo: 'BATERIA',
            marca: (input.bateriaReal || '').split(' ')[0],
            modelo: input.bateriaReal || '',
            numeroSerie: input.serialBateria,
            garantiaAnios: 10,
            garantiaHasta: new Date(Date.now() + 10 * 365.25 * 24 * 3600000),
          },
        });
      }
    }
  }

  // Auditoría
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'VALIDACION_AVANZADA',
      entidad: 'checklist',
      entidadId: checklist.id,
      detalle: JSON.stringify({
        resultado,
        criticos_fallidos: criticosFallidos.length,
        serial_inversor: input.serialInversor,
      }),
    },
  });

  logger.info('validacion_avanzada', { id: checklist.id, resultado });
  return { checklist, resultado, criticosFallidos: criticosFallidos.length };
}

// ── Listar validaciones ──
export async function listar() {
  return prisma.checklistValidacion.findMany({
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true } } } },
      creadoPor: { select: { nombre: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ── Detalle validación ──
export async function detalle(id: string) {
  return prisma.checklistValidacion.findUnique({
    where: { id },
    include: {
      items: true,
      obra: { select: { codigo: true, tipo: true, cliente: { select: { nombre: true, apellidos: true } } } },
      creadoPor: { select: { nombre: true } },
    },
  });
}

// ── OCR placeholder (Fase A: manual, Fase B: Tesseract) ──
export async function extraerSerialOCR(imageBase64: string): Promise<string | null> {
  // TODO Fase B: Integrar Tesseract.js o API OCR
  // Por ahora retorna null → el instalador introduce serial manualmente
  try {
    // Placeholder: intentar extraer con patrón regex básico si se implementa
    return null;
  } catch {
    return null;
  }
}
