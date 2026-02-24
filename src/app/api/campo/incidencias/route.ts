// src/app/api/campo/incidencias/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const incidenciaSchema = z.object({
  obraId: z.string().uuid(),
  gravedad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  descripcion: z.string().min(5, 'Descripción muy corta'),
  fotoUrl: z.string().optional(),
});

export const POST = withAuth('incidencias:crear', async (req, { usuario }) => {
  const input = await incidenciaSchema.parseAsync(await req.json());

  const incidencia = await prisma.incidencia.create({
    data: {
      obraId: input.obraId,
      gravedad: input.gravedad,
      descripcion: input.descripcion,
      fotoUrl: input.fotoUrl,
      creadoPorId: usuario.id,
      estado: 'ABIERTA',
    },
  });

  // Si gravedad es ALTA o CRITICA, cambiar estado de obra a INCIDENCIA
  if (['ALTA', 'CRITICA'].includes(input.gravedad)) {
    const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
    if (obra && obra.estado !== 'INCIDENCIA') {
      await prisma.obra.update({
        where: { id: input.obraId },
        data: { estado: 'INCIDENCIA' },
      });
      await prisma.actividad.create({
        data: {
          obraId: input.obraId,
          usuarioId: usuario.id,
          accion: 'ESTADO_CAMBIADO',
          entidad: 'obra',
          entidadId: input.obraId,
          detalle: JSON.stringify({ estadoAnterior: obra.estado, nuevoEstado: 'INCIDENCIA', motivo: `Incidencia ${input.gravedad}` }),
        },
      });
    }
  }

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'INCIDENCIA_CREADA',
      entidad: 'incidencia',
      entidadId: incidencia.id,
      detalle: JSON.stringify({ gravedad: input.gravedad, descripcion: input.descripcion }),
    },
  });

  logger.info('incidencia_creada', { obraId: input.obraId, gravedad: input.gravedad, usuario: usuario.email });
  return apiOk(incidencia, 201);
});
