// src/app/api/legalizacion/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const updateSchema = z.object({
  estadoLegal: z.enum(['PENDIENTE', 'SOLICITADA', 'EN_TRAMITE', 'APROBADA', 'INSCRITA']),
  expediente: z.string().optional(),
});

export const PATCH = withAuth('legalizacion:gestionar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const input = await updateSchema.parseAsync(await req.json());

  const obra = await prisma.obra.findUnique({ where: { id } });
  if (!obra) return apiError('Obra no encontrada', 404);

  const updated = await prisma.obra.update({
    where: { id },
    data: {
      estadoLegalizacion: input.estadoLegal as any,
      expedienteLegal: input.expediente ?? obra.expedienteLegal,
      // Si se inscribe, cambiar estado general a LEGALIZADA
      ...(input.estadoLegal === 'INSCRITA' ? { estado: 'LEGALIZADA' } : {}),
    },
  });

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: id,
      usuarioId: usuario.id,
      accion: 'LEGALIZACION_ACTUALIZADA',
      entidad: 'obra',
      entidadId: id,
      detalle: JSON.stringify({
        estadoLegalAnterior: obra.estadoLegalizacion,
        nuevoEstadoLegal: input.estadoLegal,
        expediente: input.expediente,
      }),
    },
  });

  logger.info('legalizacion_actualizada', { obraId: id, estadoLegal: input.estadoLegal, usuario: usuario.email });
  return apiOk(updated);
});
