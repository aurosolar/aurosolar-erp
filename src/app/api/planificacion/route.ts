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
  jornadas: z.array(z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1),
  instaladorIds: z.array(z.string().uuid()).min(1),
});

// Legacy support: accept old format too
const programarLegacySchema = z.object({
  obraId: z.string().uuid(),
  fecha: z.string(),
  instaladorIds: z.array(z.string().uuid()).min(1),
});

export const POST = withAuth('planificacion:gestionar', async (req, { usuario }) => {
  try {
    const body = await req.json();

    // Try new format first, fall back to legacy
    let input: { obraId: string; jornadas: Array<{ fecha: string; horaInicio: string; horaFin: string }>; instaladorIds: string[] };

    if (body.jornadas) {
      input = programarSchema.parse(body);
    } else if (body.fecha) {
      const legacy = programarLegacySchema.parse(body);
      const fechaStr = legacy.fecha.split('T')[0];
      input = {
        obraId: legacy.obraId,
        jornadas: [{ fecha: fechaStr, horaInicio: '08:00', horaFin: '17:00' }],
        instaladorIds: legacy.instaladorIds,
      };
    } else {
      return apiError('Formato inválido', 422);
    }

    const result = await planService.programarObra(input, usuario.id);
    return apiOk(result, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
