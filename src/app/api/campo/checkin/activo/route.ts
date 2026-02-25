// src/app/api/campo/checkin/activo/route.ts
// GET: Devuelve el checkin activo (sin horaSalida) del instalador
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (_req, { usuario }) => {
  const checkinActivo = await prisma.checkin.findFirst({
    where: {
      instaladorId: usuario.id,
      horaSalida: null,
    },
    orderBy: { horaEntrada: 'desc' },
    include: {
      obra: {
        select: {
          id: true,
          codigo: true,
          tipo: true,
          estado: true,
          direccionInstalacion: true,
          localidad: true,
          potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });

  return apiOk(checkinActivo);
});
