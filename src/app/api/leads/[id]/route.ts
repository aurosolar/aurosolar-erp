// src/app/api/leads/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crmService from '@/services/crm.service';

export const dynamic = 'force-dynamic';

const avanzarSchema = z.object({
  estado: z.string(),
  nota: z.string().optional(),
});

export const PATCH = withAuth('crm:crear', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const input = await avanzarSchema.parseAsync(await req.json());
  try {
    const lead = await crmService.avanzarLead(id, input.estado, usuario.id, input.nota);
    return apiOk(lead);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
