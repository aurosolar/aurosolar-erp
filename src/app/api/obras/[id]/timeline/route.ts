// src/app/api/obras/[id]/timeline/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req) => {
  const segments = req.nextUrl.pathname.split('/');
  const obraId = segments[segments.indexOf('obras') + 1];
  if (!obraId) return apiError('ID requerido', 400);

  const actividades = await prisma.actividad.findMany({
    where: { obraId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      accion: true,
      detalle: true,
      createdAt: true,
      seq: true,
      hash: true,
      usuario: { select: { nombre: true, apellidos: true } },
    },
  });

  return apiOk(actividades);
});
