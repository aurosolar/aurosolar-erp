// src/services/documentos.service.ts
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import logger from '@/lib/logger';

// ── Subir archivo ──
export async function subir(input: {
  obraId: string;
  tipo: string;
  nombre: string;
  descripcion?: string;
  data: Buffer;
  mimeType: string;
  visible?: boolean;
}, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId }, select: { codigo: true } });
  if (!obra) throw new Error('Obra no encontrada');

  // Ruta: obras/{codigo}/{tipo}/{timestamp}_{nombre}
  const ts = Date.now();
  const ext = input.nombre.split('.').pop() || 'bin';
  const key = `obras/${obra.codigo}/${input.tipo.toLowerCase()}/${ts}.${ext}`;

  await storage.upload(key, input.data, input.mimeType);
  const url = storage.getUrl(key);

  const doc = await prisma.documento.create({
    data: {
      obraId: input.obraId,
      tipo: input.tipo as any,
      nombre: input.nombre,
      descripcion: input.descripcion,
      rutaArchivo: key,
      mimeType: input.mimeType,
      tamanoBytes: input.data.length,
      url,
      visible: input.visible || false,
      subidoPorId: usuarioId,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'DOCUMENTO_SUBIDO',
      entidad: 'documento',
      entidadId: doc.id,
      detalle: JSON.stringify({ tipo: input.tipo, nombre: input.nombre, size: input.data.length }),
    },
  });

  logger.info('documento_subido', { id: doc.id, obraId: input.obraId, tipo: input.tipo });
  return doc;
}

// ── Listar documentos de una obra ──
export async function listarPorObra(obraId: string) {
  return prisma.documento.findMany({
    where: { obraId, deletedAt: null },
    include: { subidoPor: { select: { nombre: true, apellidos: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Listar todos con filtros ──
export async function listar(filtros?: { obraId?: string; tipo?: string }) {
  return prisma.documento.findMany({
    where: {
      deletedAt: null,
      ...(filtros?.obraId ? { obraId: filtros.obraId } : {}),
      ...(filtros?.tipo ? { tipo: filtros.tipo as any } : {}),
    },
    include: {
      obra: { select: { codigo: true } },
      subidoPor: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

// ── Descargar archivo ──
export async function descargar(key: string) {
  return storage.download(key);
}

// ── Eliminar (soft delete) ──
export async function eliminar(id: string) {
  return prisma.documento.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ── Toggle visible en portal ──
export async function toggleVisible(id: string) {
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) throw new Error('Documento no encontrado');
  return prisma.documento.update({
    where: { id },
    data: { visible: !doc.visible },
  });
}

// ── Resumen por obra ──
export async function resumenPorObra(obraId: string) {
  const docs = await prisma.documento.groupBy({
    by: ['tipo'],
    where: { obraId, deletedAt: null },
    _count: true,
  });
  const total = await prisma.documento.count({ where: { obraId, deletedAt: null } });
  return { total, porTipo: docs.map(d => ({ tipo: d.tipo, count: d._count })) };
}
