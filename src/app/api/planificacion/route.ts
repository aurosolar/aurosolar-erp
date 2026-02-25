// src/app/api/planificacion/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('planificacion:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
  const instaladorId = searchParams.get('instaladorId') || undefined;
  const eventos = await planService.listarEventos({ desde, hasta, instaladorId });
  return apiOk(eventos);
});

const programarSchema = z.object({
  obraId: z.string().uuid(),
  fecha: z.string(),
  instaladorIds: z.array(z.string().uuid()).min(1),
});

export const POST = withAuth('planificacion:gestionar', async (req, { usuario }) => {
  try {
    const input = await programarSchema.parseAsync(await req.json());
    const result = await planService.programarObra(
      { ...input, fecha: new Date(input.fecha) },
      usuario.id
    );
    return apiOk(result, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
