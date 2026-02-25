// src/services/activos.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Listar activos con filtros ──
export async function listarActivos(filtros?: {
  clienteId?: string;
  obraId?: string;
  tipo?: string;
  garantiaVencida?: boolean;
}) {
  const hoy = new Date();
  return prisma.activoInstalado.findMany({
    where: {
      activo: true,
      ...(filtros?.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(filtros?.obraId ? { obraId: filtros.obraId } : {}),
      ...(filtros?.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros?.garantiaVencida === true ? { garantiaHasta: { lt: hoy } } : {}),
      ...(filtros?.garantiaVencida === false ? { garantiaHasta: { gte: hoy } } : {}),
    },
    include: {
      obra: {
        select: {
          codigo: true,
          cliente: { select: { id: true, nombre: true, apellidos: true } },
        },
      },
      mantenimientos: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Detalle de activo con mantenimientos ──
export async function detalleActivo(id: string) {
  return prisma.activoInstalado.findUnique({
    where: { id },
    include: {
      obra: {
        select: {
          codigo: true,
          direccionInstalacion: true,
          localidad: true,
          cliente: { select: { id: true, nombre: true, apellidos: true, telefono: true, email: true } },
        },
      },
      mantenimientos: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// ── Crear activo desde obra terminada ──
export async function crearActivo(input: {
  obraId: string;
  clienteId?: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  potencia?: number;
  fechaInstalacion?: string;
  garantiaAnios?: number;
}, usuarioId: string) {
  const fechaInst = input.fechaInstalacion ? new Date(input.fechaInstalacion) : new Date();
  let garantiaHasta: Date | null = null;
  if (input.garantiaAnios) {
    garantiaHasta = new Date(fechaInst);
    garantiaHasta.setFullYear(garantiaHasta.getFullYear() + input.garantiaAnios);
  }

  // Si no se pasa clienteId, lo sacamos de la obra
  let clienteId = input.clienteId;
  if (!clienteId) {
    const obra = await prisma.obra.findUnique({ where: { id: input.obraId }, select: { clienteId: true } });
    clienteId = obra?.clienteId || undefined;
  }

  const activo = await prisma.activoInstalado.create({
    data: {
      obraId: input.obraId,
      clienteId: clienteId || null,
      tipo: input.tipo,
      marca: input.marca,
      modelo: input.modelo,
      numeroSerie: input.numeroSerie,
      potencia: input.potencia,
      fechaInstalacion: fechaInst,
      garantiaHasta,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'ACTIVO_REGISTRADO',
      entidad: 'activo_instalado',
      entidadId: activo.id,
      detalle: JSON.stringify({ tipo: input.tipo, marca: input.marca, modelo: input.modelo }),
    },
  });

  logger.info('activo_creado', { id: activo.id, tipo: input.tipo, obraId: input.obraId });
  return activo;
}

// ── Registrar activos en lote (al terminar obra) ──
export async function crearActivosLote(obraId: string, activos: Array<{
  tipo: string; marca?: string; modelo?: string;
  numeroSerie?: string; potencia?: number; garantiaAnios?: number;
}>, usuarioId: string) {
  const resultados = [];
  for (const a of activos) {
    const activo = await crearActivo({ obraId, ...a }, usuarioId);
    resultados.push(activo);
  }
  return resultados;
}

// ── Programar mantenimiento ──
export async function programarMantenimiento(input: {
  activoId: string;
  tipo: string;
  fechaProgramada: string;
  descripcion?: string;
  coste?: number;
}) {
  return prisma.mantenimiento.create({
    data: {
      activoId: input.activoId,
      tipo: input.tipo,
      fechaProgramada: new Date(input.fechaProgramada),
      descripcion: input.descripcion,
      coste: input.coste,
    },
  });
}

// ── Completar mantenimiento ──
export async function completarMantenimiento(id: string, resultado: string) {
  return prisma.mantenimiento.update({
    where: { id },
    data: {
      estado: 'COMPLETADO',
      fechaRealizada: new Date(),
      resultado,
    },
  });
}

// ── KPIs de activos ──
export async function resumenActivos() {
  const hoy = new Date();
  const en90dias = new Date();
  en90dias.setDate(en90dias.getDate() + 90);

  const [total, garantiaVencida, garantiaProxima, mantenimientosPendientes] = await Promise.all([
    prisma.activoInstalado.count({ where: { activo: true } }),
    prisma.activoInstalado.count({ where: { activo: true, garantiaHasta: { lt: hoy } } }),
    prisma.activoInstalado.count({ where: { activo: true, garantiaHasta: { gte: hoy, lte: en90dias } } }),
    prisma.mantenimiento.count({ where: { estado: { in: ['PROGRAMADO', 'EN_CURSO'] } } }),
  ]);

  return { total, garantiaVencida, garantiaProxima, mantenimientosPendientes };
}
