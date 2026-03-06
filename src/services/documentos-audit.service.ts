// src/services/documentos-audit.service.ts
// ═══════════════════════════════════════════════════════════
// Soft-delete de documentos con reason + auditoría HMAC
// ═══════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { registrarEvento } from '@/services/auditoria-hmac.service';
import logger from '@/lib/logger';

export async function softDeleteDocumento(params: {
  documentoId: string;
  usuarioId: string;
  reason: string;
}): Promise<void> {
  const { documentoId, usuarioId, reason } = params;

  if (!reason || reason.trim().length < 5) {
    throw new Error('Se requiere un motivo de al menos 5 caracteres para eliminar un documento');
  }

  const doc = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: { id: true, obraId: true, nombre: true, tipo: true, deletedAt: true },
  });

  if (!doc) throw new Error('Documento no encontrado');
  if (doc.deletedAt) throw new Error('El documento ya fue eliminado');

  await prisma.documento.update({
    where: { id: documentoId },
    data: {
      deletedAt: new Date(),
      deletedBy: usuarioId,
      deleteReason: reason.trim(),
    },
  });

  // Registrar en cadena HMAC
  await registrarEvento({
    obraId: doc.obraId || 'sin-obra',
    usuarioId,
    accion: 'DOCUMENTO_ELIMINADO',
    entidad: 'documento',
    entidadId: documentoId,
    detalle: {
      nombre: doc.nombre,
      tipo: doc.tipo,
      reason: reason.trim(),
    },
  });

  logger.info('documento_soft_deleted', {
    documentoId,
    obraId: doc.obraId || 'sin-obra',
    nombre: doc.nombre,
    reason: reason.trim(),
    usuario: usuarioId,
  });
}
