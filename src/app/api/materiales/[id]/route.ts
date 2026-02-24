// src/app/api/materiales/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as matService from '@/services/materiales.service';

const cambiarEstadoSchema = z.object({
  estado: z.enum(['ENVIADA', 'APROBADA', 'RECHAZADA', 'PEDIDA', 'RECIBIDA_PARCIAL', 'RECIBIDA']),
  notas: z.string().optional(),
});

export const GET = withAuth('materiales:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const solicitud = await matService.detalleSolicitud(id);
  if (!solicitud) return apiError('No encontrada', 404);
  return apiOk(solicitud);
});

export const PATCH = withAuth('materiales:ver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = await cambiarEstadoSchema.parseAsync(await req.json());
    const result = await matService.cambiarEstado(id, input.estado, usuario.id, input.notas);
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
