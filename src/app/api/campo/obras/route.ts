// src/app/api/campo/obras/route.ts
// GET: Obras asignadas al instalador autenticado
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const soloActivas = searchParams.get('activas') !== 'false';

  const estadosActivos = [
    'PROGRAMADA',
    'INSTALANDO',
    'VALIDACION_OPERATIVA',
    'REVISION_COORDINADOR',
  ];

  const obras = await prisma.obra.findMany({
    where: {
      deletedAt: null,
      instaladores: { some: { instaladorId: usuario.id } },
      ...(soloActivas ? { estado: { in: estadosActivos } } : {}),
    },
    include: {
      cliente: {
        select: { id: true, nombre: true, apellidos: true, telefono: true },
      },
      instaladores: {
        include: {
          instalador: { select: { id: true, nombre: true, apellidos: true } },
        },
      },
      checkins: {
        where: {
          instaladorId: usuario.id,
          horaSalida: null,
        },
        orderBy: { horaEntrada: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          incidencias: { where: { estado: 'ABIERTA' } },
        },
      },
    },
    orderBy: [
      { estado: 'asc' }, // INSTALANDO primero (al ser "I" antes que "P")
      { createdAt: 'desc' },
    ],
  });

  // Marcar si hay checkin activo para cada obra
  const obrasConEstado = obras.map((obra) => ({
    ...obra,
    checkinActivo: obra.checkins.length > 0 ? obra.checkins[0] : null,
    checkins: undefined, // No enviar array completo
  }));

  return apiOk(obrasConEstado);
});
