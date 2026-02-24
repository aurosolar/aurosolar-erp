// src/app/api/legalizacion/route.ts
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = withAuth('legalizacion:ver', async () => {
  const obras = await prisma.obra.findMany({
    where: {
      deletedAt: null,
      estado: { in: ['LEGALIZACION', 'LEGALIZADA', 'TERMINADA', 'COMPLETADA'] },
    },
    include: {
      cliente: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  return apiOk(obras);
});
