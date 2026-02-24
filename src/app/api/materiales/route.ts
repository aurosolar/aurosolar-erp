// src/app/api/materiales/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as matService from '@/services/materiales.service';

export const GET = withAuth('materiales:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const solicitudes = await matService.listarSolicitudes({ obraId, estado });
  return apiOk(solicitudes);
});

const crearSchema = z.object({
  obraId: z.string().uuid(),
  proveedor: z.string().optional(),
  notas: z.string().optional(),
  fechaEntregaPrevista: z.string().optional(),
  lineas: z.array(z.object({
    producto: z.string().min(1),
    cantidad: z.number().int().min(1),
    costeUnitario: z.number().int().min(0),
  })).min(1),
});

export const POST = withAuth('materiales:solicitar', async (req, { usuario }) => {
  try {
    const input = await crearSchema.parseAsync(await req.json());
    const solicitud = await matService.crearSolicitud(input, usuario.id);
    return apiOk(solicitud, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
