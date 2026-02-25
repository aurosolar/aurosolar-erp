// src/app/api/campo/validacion/route.ts
import { z } from 'zod';
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const validacionSchema = z.object({
  obraId: z.string().uuid(),
  potenciaReal: z.number().positive().nullable().optional(),
  numPanelesReal: z.number().int().positive().nullable().optional(),
  observaciones: z.string().optional(),
});

export const POST = withAuth('campo:validar', async (req, { usuario }) => {
  const input = await validacionSchema.parseAsync(await req.json());

  // Crear validación
  const validacion = await prisma.validacion.create({
    data: {
      obraId: input.obraId,
      potenciaReal: input.potenciaReal ?? null,
      numPanelesReal: input.numPanelesReal ?? null,
      observaciones: input.observaciones,
      validadoPorId: usuario.id,
      completa: true,
      fotoInversorUrl: 'pendiente_upload',
      fotoPanelesUrl: 'pendiente_upload',
    },
  });

  // Cambiar estado de obra a VALIDACION_OPERATIVA (no TERMINADA)
  // Alineado con flujo Sprint 1: INSTALANDO → VALIDACION_OPERATIVA → REVISION_COORDINADOR → TERMINADA
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (obra && obra.estado === 'INSTALANDO') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: {
        estado: 'VALIDACION_OPERATIVA',
        fechaValidacion: new Date(),
      },
    });

    await prisma.actividad.create({
      data: {
        obraId: input.obraId,
        usuarioId: usuario.id,
        accion: 'ESTADO_CAMBIADO',
        entidad: 'obra',
        entidadId: input.obraId,
        detalle: JSON.stringify({
          estadoAnterior: obra.estado,
          nuevoEstado: 'VALIDACION_OPERATIVA',
          motivo: 'Validación técnica completada por instalador',
        }),
      },
    });
  }

  // Registrar actividad de la validación
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'VALIDACION_COMPLETADA',
      entidad: 'validacion',
      entidadId: validacion.id,
      detalle: JSON.stringify({
        potenciaReal: input.potenciaReal,
        numPanelesReal: input.numPanelesReal,
      }),
    },
  });

  logger.info('validacion_completada', { obraId: input.obraId, usuario: usuario.email });
  return apiOk(validacion, 201);
});
