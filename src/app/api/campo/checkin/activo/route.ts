// src/app/api/campo/checkin/activo/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET: checkin activo del instalador
export const GET = withAuth('campo:checkin', async (_req, { usuario }) => {
  const checkinActivo = await prisma.checkin.findFirst({
    where: { instaladorId: usuario.id, horaSalida: null },
    orderBy: { horaEntrada: 'desc' },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          direccionInstalacion: true, localidad: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });
  return apiOk(checkinActivo);
});

// PATCH: checkout
export const PATCH = withAuth('campo:checkin', async (req, { usuario }) => {
  const body = await req.json().catch(() => ({}));
  const nota = body.nota || null;

  const checkin = await prisma.checkin.findFirst({
    where: { instaladorId: usuario.id, horaSalida: null },
    orderBy: { horaEntrada: 'desc' },
  });

  if (!checkin) return apiError('No hay check-in activo', 404);

  const ahora = new Date();
  const duracionMin = Math.round((ahora.getTime() - checkin.horaEntrada.getTime()) / 60000);

  const updated = await prisma.checkin.update({
    where: { id: checkin.id },
    data: {
      horaSalida: ahora,
      notaSalida: nota,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: checkin.obraId,
      usuarioId: usuario.id,
      accion: 'CHECKOUT_REGISTRADO',
      entidad: 'checkin',
      entidadId: checkin.id,
      detalle: JSON.stringify({ duracionMin, nota }),
    },
  });

  logger.info('checkout_registrado', { checkinId: checkin.id, obraId: checkin.obraId, duracionMin, usuario: usuario.id });
  return apiOk({ ...updated, duracionMin });
});
