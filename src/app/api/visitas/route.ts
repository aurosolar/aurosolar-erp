// src/app/api/visitas/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmService from '@/services/crm.service';

const visitaSchema = z.object({
  leadId: z.string().uuid(),
  fecha: z.string().transform(s => new Date(s)),
  resultado: z.enum(['INTERESADO', 'PIDE_PRESUPUESTO', 'NO_INTERESADO', 'REPROGRAMAR']),
  notas: z.string().optional(),
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const body = await req.json(); const input = { leadId: body.leadId, fecha: new Date(body.fecha), resultado: body.resultado, notas: body.notas };
  const visita = await crmService.registrarVisita(input, usuario.id);
  return apiOk(visita, 201);
});
