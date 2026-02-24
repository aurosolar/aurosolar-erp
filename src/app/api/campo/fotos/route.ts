// src/app/api/campo/fotos/route.ts
import { z } from 'zod';
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const fotoSchema = z.object({
  obraId: z.string().uuid(),
  tipo: z.string(),
  nombre: z.string(),
});

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  const input = await fotoSchema.parseAsync(await req.json());

  // Mapear tipo a TipoDocumento
  const tipoMap: Record<string, string> = {
    GENERAL: 'FOTO_GENERAL',
    INVERSOR: 'FOTO_INVERSOR',
    PANELES: 'FOTO_PANELES',
    CUADRO: 'FOTO_CUADRO',
    COMPLETA: 'FOTO_INSTALACION',
  };

  const documento = await prisma.documento.create({
    data: {
      obraId: input.obraId,
      tipo: (tipoMap[input.tipo] || 'FOTO_GENERAL') as any,
      nombre: input.nombre,
      rutaArchivo: `pendiente/${input.obraId}/${input.nombre}`, // TODO: upload real
      subidoPorId: usuario.id,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'FOTO_SUBIDA',
      entidad: 'documento',
      entidadId: documento.id,
      detalle: JSON.stringify({ tipo: input.tipo, nombre: input.nombre }),
    },
  });

  logger.info('foto_subida', { obraId: input.obraId, tipo: input.tipo, usuario: usuario.email });
  return apiOk(documento, 201);
});
