// src/services/media.service.ts
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import logger from '@/lib/logger';

export async function upload(input: {
  file: Buffer;
  fileName: string;
  mimeType: string;
  entityType: string;
  entityId: string;
  obraId?: string;
  tipo?: string;
}, usuarioId: string) {
  const ts = Date.now();
  const ext = input.fileName.split('.').pop() || 'bin';
  const safeEntity = input.entityType.toLowerCase();
  const key = `media/${safeEntity}/${input.entityId}/${ts}.${ext}`;

  await storage.upload(key, input.file, input.mimeType);
  const url = storage.getUrl(key);

  const doc = await prisma.documento.create({
    data: {
      obraId: input.obraId || undefined,
      tipo: (input.tipo || 'FOTO_GENERAL') as any,
      nombre: input.fileName,
      rutaArchivo: key,
      mimeType: input.mimeType,
      tamanoBytes: input.file.length,
      url,
      entityType: input.entityType,
      entityId: input.entityId,
      subidoPorId: usuarioId,
    },
  });

  // Actividad si hay obraId
  if (input.obraId) {
    await prisma.actividad.create({
      data: {
        obraId: input.obraId,
        usuarioId,
        accion: 'FOTO_SUBIDA',
        entidad: input.entityType.toLowerCase(),
        entidadId: input.entityId,
        detalle: JSON.stringify({ tipo: input.tipo, nombre: input.fileName, size: input.file.length }),
      },
    });
  }

  logger.info('media_uploaded', { id: doc.id, entityType: input.entityType, entityId: input.entityId });
  return doc;
}

export async function listByEntity(entityType: string, entityId: string) {
  return prisma.documento.findMany({
    where: { entityType, entityId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, nombre: true, url: true, thumbnailUrl: true,
      mimeType: true, tamanoBytes: true, tipo: true, createdAt: true,
      subidoPor: { select: { nombre: true } },
    },
  });
}

export async function softDelete(id: string, usuarioId: string) {
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) throw new Error('Documento no encontrado');

  await prisma.documento.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: usuarioId, deleteReason: 'Eliminado por usuario' },
  });

  logger.info('media_deleted', { id, by: usuarioId });
  return { ok: true };
}
