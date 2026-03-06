import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('obras:ver', async (req, { usuario }) => {
  const url = req.nextUrl.pathname.split('/').filter(Boolean);
  const checklistId = url[url.indexOf('checklist') + 1];

  try {
    const checklist = await prisma.checklistValidacion.findUnique({ where: { id: checklistId } });
    if (!checklist) return apiError('Checklist no encontrado', 404);
    if (checklist.status !== 'BORRADOR') return apiError('Solo se puede enviar un checklist en BORRADOR', 422);

    const updated = await prisma.checklistValidacion.update({
      where: { id: checklistId },
      data: { status: 'SUBMITIDA', submittedAt: new Date(), submittedById: usuario.id },
    });

    await prisma.actividad.create({
      data: { obraId: checklist.obraId, usuarioId: usuario.id, accion: 'CHECKLIST_SUBMITIDO', entidad: 'checklist', entidadId: checklistId },
    });

    logger.info('checklist_submitido', { checklistId, usuario: usuario.id });
    return apiOk(updated);
  } catch (error) {
    logger.error('checklist_submit_error', { checklistId, error: error instanceof Error ? error.message : error });
    return apiError('Error al enviar checklist', 500);
  }
});
