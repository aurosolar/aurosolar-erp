// src/services/clientes.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function listar(filtros?: { q?: string }) {
  const q = filtros?.q;
  return prisma.cliente.findMany({
    where: {
      deletedAt: null,
      ...(q ? {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' as const } },
          { apellidos: { contains: q, mode: 'insensitive' as const } },
          { dniCif: { contains: q, mode: 'insensitive' as const } },
          { telefono: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { obras: true } },
    },
    orderBy: { nombre: 'asc' },
    take: 200,
  });
}

export async function detalle(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      obras: {
        where: { deletedAt: null },
        select: {
          id: true, codigo: true, estado: true, tipo: true,
          presupuesto: true, localidad: true, createdAt: true,
          pagos: { select: { importe: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      leads: {
        select: { id: true, estado: true, importeEstimado: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function crear(input: {
  nombre: string; apellidos?: string; dniCif?: string;
  telefono?: string; email?: string; direccion?: string;
  codigoPostal?: string; localidad?: string; provincia?: string; notas?: string;
}) {
  const cliente = await prisma.cliente.create({ data: input as any });
  logger.info('cliente_creado', { id: cliente.id, nombre: input.nombre });
  return cliente;
}

export async function actualizar(id: string, input: {
  nombre?: string; apellidos?: string; dniCif?: string;
  telefono?: string; email?: string; direccion?: string;
  codigoPostal?: string; localidad?: string; provincia?: string; notas?: string;
}) {
  return prisma.cliente.update({ where: { id }, data: input });
}

export async function resumen() {
  const [total, conObra, sinObra] = await Promise.all([
    prisma.cliente.count({ where: { deletedAt: null } }),
    prisma.cliente.count({ where: { deletedAt: null, obras: { some: {} } } }),
    prisma.cliente.count({ where: { deletedAt: null, obras: { none: {} } } }),
  ]);
  return { total, conObra, sinObra };
}
