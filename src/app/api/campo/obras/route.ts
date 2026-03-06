// src/app/api/campo/obras/route.ts
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const todas = searchParams.get('todas') === 'true';

  if (todas) {
    // Todas las obras asignadas al instalador (para vista "Obras")
    const obras = await prisma.obra.findMany({
      where: {
        deletedAt: null,
        instaladores: { some: { instaladorId: usuario.id } },
      },
      include: {
        cliente: { select: { id: true, nombre: true, apellidos: true, telefono: true } },
        instaladores: {
          include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
        },
        _count: { select: { incidencias: { where: { estado: 'ABIERTA' } } } },
      },
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });
    return apiOk(obras);
  }

  // Solo obras con jornada programada HOY para este instalador
  const ahora = new Date();
  const hoyStr = ahora.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

  const jornadasHoy = await prisma.obraJornada.findMany({
    where: {
      fecha: new Date(hoyStr + 'T12:00:00Z'),
      instaladores: { some: { instaladorId: usuario.id } },
      obra: { deletedAt: null },
    },
    select: { obraId: true },
  });

  const obraIdsHoy = Array.from(new Set(jornadasHoy.map(j => j.obraId)));

  if (obraIdsHoy.length === 0) return apiOk([]);

  const obras = await prisma.obra.findMany({
    where: {
      id: { in: obraIdsHoy },
      deletedAt: null,
    },
    include: {
      cliente: { select: { id: true, nombre: true, apellidos: true, telefono: true } },
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
      _count: { select: { incidencias: { where: { estado: 'ABIERTA' } } } },
    },
    orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
  });

  return apiOk(obras);
});
