// GET + POST /api/planificacion/jornadas
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('planificacion:ver', async (req) => {
  const obraId = new URL(req.url).searchParams.get('obraId');
  if (!obraId) return apiError('obraId requerido', 400);
  try {
    const data = await planService.jornadasDeObra(obraId);
    return apiOk(data);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 404);
  }
});

const crearSchema = z.object({
  obraId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  instaladorIds: z.array(z.string().uuid()).min(1),
  notas: z.string().optional(),
});

export const POST = withAuth('planificacion:gestionar', async (req, { usuario }) => {
  try {
    const input = crearSchema.parse(await req.json());
    const jornada = await planService.crearJornada(input, usuario.id);
    return apiOk(jornada, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
