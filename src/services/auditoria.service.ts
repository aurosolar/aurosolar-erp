// src/services/auditoria.service.ts
import { prisma } from '@/lib/prisma';

export async function listar(filtros?: {
  obraId?: string;
  usuarioId?: string;
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}) {
  const limit = filtros?.limit || 100;
  return prisma.actividad.findMany({
    where: {
      ...(filtros?.obraId ? { obraId: filtros.obraId } : {}),
      ...(filtros?.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      ...(filtros?.entidad ? { entidad: filtros.entidad } : {}),
      ...(filtros?.accion ? { accion: { contains: filtros.accion, mode: 'insensitive' as const } } : {}),
      ...(filtros?.desde || filtros?.hasta ? {
        createdAt: {
          ...(filtros?.desde ? { gte: new Date(filtros.desde) } : {}),
          ...(filtros?.hasta ? { lte: new Date(filtros.hasta + 'T23:59:59') } : {}),
        },
      } : {}),
    },
    include: {
      usuario: { select: { nombre: true, apellidos: true, rol: true } },
      obra: { select: { codigo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function resumen() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const semana = new Date(hoy);
  semana.setDate(semana.getDate() - 7);

  const [totalHoy, totalSemana, totalGlobal, porEntidad, porUsuario] = await Promise.all([
    prisma.actividad.count({ where: { createdAt: { gte: hoy } } }),
    prisma.actividad.count({ where: { createdAt: { gte: semana } } }),
    prisma.actividad.count(),
    prisma.actividad.groupBy({
      by: ['entidad'],
      _count: true,
      where: { createdAt: { gte: semana } },
      orderBy: { _count: { entidad: 'desc' } },
    }),
    prisma.actividad.groupBy({
      by: ['usuarioId'],
      _count: true,
      where: { createdAt: { gte: semana } },
      orderBy: { _count: { usuarioId: 'desc' } },
      take: 5,
    }),
  ]);

  // Enriquecer con nombres de usuario
  const userIds = porUsuario.map(u => u.usuarioId);
  const users = await prisma.usuario.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nombre: true, apellidos: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, `${u.nombre} ${u.apellidos || ''}`.trim()]));

  return {
    totalHoy,
    totalSemana,
    totalGlobal,
    porEntidad: porEntidad.map(e => ({ entidad: e.entidad, count: e._count })),
    porUsuario: porUsuario.map(u => ({ usuario: userMap[u.usuarioId] || 'Desconocido', count: u._count })),
  };
}

export async function entidadesUnicas() {
  const result = await prisma.actividad.findMany({
    select: { entidad: true },
    distinct: ['entidad'],
    orderBy: { entidad: 'asc' },
  });
  return result.map(r => r.entidad);
}

export async function accionesUnicas() {
  const result = await prisma.actividad.findMany({
    select: { accion: true },
    distinct: ['accion'],
    orderBy: { accion: 'asc' },
  });
  return result.map(r => r.accion);
}
