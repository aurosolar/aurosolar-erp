// src/app/api/incidencias/route.ts
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = withAuth('incidencias:ver', async () => {
  const incidencias = await prisma.incidencia.findMany({
    include: {
      obra: { select: { codigo: true, id: true } },
      creadoPor: { select: { nombre: true } },
    },
    orderBy: [{ estado: 'asc' }, { gravedad: 'desc' }, { createdAt: 'asc' }],
  });
  return apiOk(incidencias);
});
