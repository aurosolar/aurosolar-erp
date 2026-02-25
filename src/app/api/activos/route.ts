// src/app/api/activos/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as activosService from '@/services/activos.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('activos:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId') || undefined;
  const clienteId = searchParams.get('clienteId') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const activos = await activosService.listarActivos({ obraId, clienteId, tipo });
  return apiOk(activos);
});

const crearSchema = z.object({
  obraId: z.string().uuid(),
  tipo: z.string().min(1),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  potencia: z.number().optional(),
  garantiaAnios: z.number().int().min(1).max(30).optional(),
});

export const POST = withAuth('activos:gestionar', async (req, { usuario }) => {
  try {
    const input = await crearSchema.parseAsync(await req.json());
    const activo = await activosService.crearActivo(input, usuario.id);
    return apiOk(activo, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
