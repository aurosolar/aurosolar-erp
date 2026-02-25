// src/app/api/campo/gastos/route.ts
import { z } from 'zod';
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const gastoSchema = z.object({
  obraId: z.string().uuid(),
  tipo: z.enum(['MATERIAL_EXTRA', 'COMBUSTIBLE', 'DIETA', 'PARKING_PEAJE', 'HERRAMIENTA', 'OTRO']),
  importe: z.number().int().positive('Importe debe ser positivo'), // Céntimos
  descripcion: z.string().optional(),
});

export const POST = withAuth('campo:gastos', async (req, { usuario }) => {
  const input = await gastoSchema.parseAsync(await req.json());

  const gasto = await prisma.gasto.create({
    data: {
      obraId: input.obraId,
      tipo: input.tipo,
      importe: input.importe,
      descripcion: input.descripcion,
      registradoPorId: usuario.id,
    },
  });

  // Actualizar coste total de la obra
  await prisma.obra.update({
    where: { id: input.obraId },
    data: { costeTotal: { increment: input.importe } },
  });

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'GASTO_REGISTRADO',
      entidad: 'gasto',
      entidadId: gasto.id,
      detalle: JSON.stringify({ tipo: input.tipo, importe: input.importe, descripcion: input.descripcion }),
    },
  });

  logger.info('gasto_registrado', { obraId: input.obraId, tipo: input.tipo, importe: input.importe, usuario: usuario.email });
  return apiOk(gasto, 201);
});
