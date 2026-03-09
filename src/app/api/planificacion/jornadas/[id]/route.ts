// PATCH + DELETE /api/planificacion/jornadas/[id]
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const dynamic = 'force-dynamic';

const editSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  instaladorIds: z.array(z.string().uuid()).optional(),
  notas: z.string().optional(),
});

export const PATCH = withAuth('planificacion:gestionar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = editSchema.parse(await req.json());
    const result = await planService.editarJornada(id, input, usuario.id);
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});

export const DELETE = withAuth('planificacion:gestionar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const result = await planService.eliminarJornada(id, usuario.id);
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
