// src/app/api/clientes/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const crearClienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().optional().default(''),
  dniCif: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
});

export const POST = withAuth('obras:crear', async (req) => {
  const input = await parseBody(req, crearClienteSchema);
  const cliente = await prisma.cliente.create({ data: input });
  return apiOk(cliente, 201);
});

export const GET = withAuth('obras:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const clientes = await prisma.cliente.findMany({
    where: q ? {
      OR: [
        { nombre: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { dniCif: { contains: q, mode: 'insensitive' } },
      ],
    } : {},
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return apiOk(clientes);
});
