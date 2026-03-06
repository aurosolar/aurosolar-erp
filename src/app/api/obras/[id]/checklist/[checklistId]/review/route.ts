import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('obras:cambiarEstado', async (req, { usuario }) => {
  const url = req.nextUrl.pathname.split('/').filter(Boolean);
  const checklistId = url[url.indexOf('checklist') + 1];

  try {
    const body = await req.json();
    const { decision, notes } = body;
    if (!decision || !['APROBADA', 'RECHAZADA'].includes(decision)) {
      return apiError('decision debe ser APROBADA o RECHAZADA', 422);
    }

    const checklist = await prisma.checklistValidacion.findUnique({ where: { id: checklistId } });
    if (!checklist) return apiError('Checklist no encontrado', 404);
    if (checklist.status !== 'SUBMITIDA') return apiError('Solo se puede revisar un checklist SUBMITIDO', 422);

    const updated = await prisma.checklistValidacion.update({
      where: { id: checklistId },
      data: { status: decision, reviewedAt: new Date(), reviewedById: usuario.id, reviewDecision: decision, reviewNotes: notes || null },
    });

    await prisma.actividad.create({
      data: { obraId: checklist.obraId, usuarioId: usuario.id, accion: decision === 'APROBADA' ? 'CHECKLIST_APROBADO' : 'CHECKLIST_RECHAZADO', entidad: 'checklist', entidadId: checklistId, detalle: JSON.stringify({ decision, notes }) },
    });

    logger.info('checklist_revisado', { checklistId, decision, usuario: usuario.id });
    return apiOk(updated);
  } catch (error) {
    logger.error('checklist_review_error', { checklistId, error: error instanceof Error ? error.message : error });
    return apiError('Error al revisar checklist', 500);
  }
});
