// src/app/api/campo/incidencias/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const incidenciaSchema = z.object({
  obraId: z.string().uuid(),
  gravedad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  descripcion: z.string().min(5, 'Descripción muy corta'),
  fotoUrl: z.string().optional(),
  categoria: z.string().optional(),
});

export const POST = withAuth('incidencias:crear', async (req, { usuario }) => {
  const input = await incidenciaSchema.parseAsync(await req.json());

  // SLA automático por gravedad
  const slaMap: Record<string, number> = { BAJA: 72, MEDIA: 48, ALTA: 24, CRITICA: 4 };

  const incidencia = await prisma.incidencia.create({
    data: {
      obraId: input.obraId,
      gravedad: input.gravedad,
      descripcion: input.descripcion,
      fotoUrl: input.fotoUrl,
      categoria: input.categoria,
      slaHoras: slaMap[input.gravedad],
      creadoPorId: usuario.id,
      estado: 'ABIERTA',
    },
  });

  // Si gravedad es CRITICA, activar flag en la obra (no cambiar estado)
  if (input.gravedad === 'CRITICA') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: { tieneIncidenciaCritica: true },
    });
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
