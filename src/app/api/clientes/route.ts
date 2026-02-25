// src/app/api/clientes/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError, parseBody } from '@/lib/api';
import * as clienteService from '@/services/clientes.service';

export const dynamic = 'force-dynamic';

const crearClienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().optional().default(''),
  dniCif: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  codigoPostal: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  notas: z.string().optional(),
});

export const GET = withAuth('obras:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || undefined;
  const clientes = await clienteService.listar({ q });
  return apiOk(clientes);
});

export const POST = withAuth('obras:crear', async (req) => {
  try {
    const input = await parseBody(req, crearClienteSchema);
    const cliente = await clienteService.crear(input);
    return apiOk(cliente, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
