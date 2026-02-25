// src/app/api/clientes/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError, parseBody } from '@/lib/api';
import * as clienteService from '@/services/clientes.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const cliente = await clienteService.detalle(id);
    if (!cliente) return apiError('Cliente no encontrado', 404);
    return apiOk(cliente);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 500);
  }
});

const actualizarSchema = z.object({
  nombre: z.string().optional(),
  apellidos: z.string().optional(),
  dniCif: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  codigoPostal: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  notas: z.string().optional(),
});

export const PATCH = withAuth('obras:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = await parseBody(req, actualizarSchema);
    const cliente = await clienteService.actualizar(id, input);
    return apiOk(cliente);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
