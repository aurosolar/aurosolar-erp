// src/app/api/mantenimientos/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as activosService from '@/services/activos.service';

export const dynamic = 'force-dynamic';

const completarSchema = z.object({
  resultado: z.string().min(1),
});

export const PATCH = withAuth('activos:gestionar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = await completarSchema.parseAsync(await req.json());
    const mant = await activosService.completarMantenimiento(id, input.resultado);
    return apiOk(mant);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
