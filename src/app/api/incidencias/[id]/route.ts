// src/app/api/incidencias/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  estado: z.enum(['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA']),
  notasResolucion: z.string().optional(),
});

export const PATCH = withAuth('incidencias:resolver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const input = await updateSchema.parseAsync(await req.json());

  const incidencia = await prisma.incidencia.findUnique({ where: { id } });
  if (!incidencia) return apiError('Incidencia no encontrada', 404);

  const updated = await prisma.incidencia.update({
    where: { id },
    data: {
      estado: input.estado,
      notasResolucion: input.notasResolucion,
      fechaResolucion: ['RESUELTA', 'CERRADA'].includes(input.estado) ? new Date() : null,
    },
  });

  // Si se resuelve, comprobar si la obra puede salir de estado INCIDENCIA
  if (['RESUELTA', 'CERRADA'].includes(input.estado) && incidencia.obraId) {
    const abiertas = await prisma.incidencia.count({
      where: { obraId: incidencia.obraId, estado: { in: ['ABIERTA', 'EN_PROCESO'] }, id: { not: id } },
    });
    if (abiertas === 0) {
      const obra = await prisma.obra.findUnique({ where: { id: incidencia.obraId } });
      if (obra && obra.estado === 'INCIDENCIA') {
        // Volver a INSTALANDO por defecto
        await prisma.obra.update({ where: { id: obra.id }, data: { estado: 'INSTALANDO' } });
        await prisma.actividad.create({
          data: {
            obraId: obra.id,
            usuarioId: usuario.id,
            accion: 'ESTADO_CAMBIADO',
            entidad: 'obra',
            entidadId: obra.id,
            detalle: JSON.stringify({ estadoAnterior: 'INCIDENCIA', nuevoEstado: 'INSTALANDO', motivo: 'Todas las incidencias resueltas' }),
          },
        });
      }
    }
  }

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: incidencia.obraId,
      usuarioId: usuario.id,
      accion: 'INCIDENCIA_RESUELTA',
      entidad: 'incidencia',
      entidadId: id,
      detalle: JSON.stringify({ estado: input.estado, notas: input.notasResolucion }),
    },
  });

  logger.info('incidencia_resuelta', { id, estado: input.estado, usuario: usuario.email });
  return apiOk(updated);
});
