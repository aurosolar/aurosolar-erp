// src/app/api/mantenimientos/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as activosService from '@/services/activos.service';

export const dynamic = 'force-dynamic';

const programarSchema = z.object({
  activoId: z.string().uuid(),
  tipo: z.enum(['Preventivo', 'Correctivo', 'Limpieza', 'Revisión']),
  fechaProgramada: z.string(),
  descripcion: z.string().optional(),
  coste: z.number().int().optional(),
});

export const POST = withAuth('activos:gestionar', async (req) => {
  try {
    const input = await programarSchema.parseAsync(await req.json());
    const mant = await activosService.programarMantenimiento(input);
    return apiOk(mant, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
