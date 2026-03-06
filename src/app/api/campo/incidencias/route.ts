// src/app/api/campo/incidencias/route.ts
import { z } from 'zod';
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { registrarEvento } from '@/services/auditoria-hmac.service';

export const dynamic = 'force-dynamic';

const SLA_HORAS: Record<string, number> = {
  BAJA: 72,
  MEDIA: 48,
  ALTA: 24,
  CRITICA: 4,
};

const incidenciaSchema = z.object({
  obraId: z.string().uuid(),
  gravedad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  descripcion: z.string().min(5, 'Descripción muy corta'),
  categoria: z.enum(['ELECTRICA', 'ESTRUCTURAL', 'ESTETICA', 'DOCUMENTAL', 'GARANTIA']).optional(),
  fotoUrl: z.string().optional(),
});

export const POST = withAuth('incidencias:crear', async (req, { usuario }) => {
  const input = await incidenciaSchema.parseAsync(await req.json());

  const incidencia = await prisma.incidencia.create({
    data: {
      obraId: input.obraId,
      gravedad: input.gravedad,
      descripcion: input.descripcion,
      categoria: input.categoria,
      fotoUrl: input.fotoUrl,
      creadoPorId: usuario.id,
      estado: 'ABIERTA',
      slaHoras: SLA_HORAS[input.gravedad] ?? 48,
    },
  });

  // Si gravedad es ALTA o CRITICA, activar flag de incidencia crítica en obra
  if (['ALTA', 'CRITICA'].includes(input.gravedad)) {
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
      detalle: JSON.stringify({
        gravedad: input.gravedad,
        categoria: input.categoria,
        descripcion: input.descripcion,
      }),
    },
  });

  // Registrar en cadena HMAC
  await registrarEvento({
    obraId: input.obraId,
    usuarioId: usuario.id,
    accion: 'INCIDENCIA_CREADA',
    entidad: 'incidencia',
    entidadId: incidencia.id,
    detalle: { gravedad: input.gravedad, categoria: input.categoria, descripcion: input.descripcion },
  });

  logger.info('incidencia_creada', {
    obraId: input.obraId,
    gravedad: input.gravedad,
    usuario: usuario.email,
  });

  return apiOk(incidencia, 201);
});
