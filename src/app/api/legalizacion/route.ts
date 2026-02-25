// src/app/api/legalizacion/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as legalService from '@/services/legalizacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('legalizacion:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') || undefined;
  const data = await legalService.listarLegalizaciones({ estado });
  return apiOk(data);
});

const avanzarSchema = z.object({
  obraId: z.string().uuid(),
  estado: z.enum(['SOLICITADA', 'EN_TRAMITE', 'APROBADA', 'INSCRITA']),
  expediente: z.string().optional(),
  notas: z.string().optional(),
});

export const POST = withAuth('legalizacion:gestionar', async (req, { usuario }) => {
  try {
    const input = await avanzarSchema.parseAsync(await req.json());
    const result = await legalService.avanzarLegalizacion(
      input.obraId, input.estado, usuario.id,
      { expediente: input.expediente, notas: input.notas },
    );
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
