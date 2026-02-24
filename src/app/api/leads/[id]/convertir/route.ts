// src/app/api/leads/[id]/convertir/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crmService from '@/services/crm.service';

export const POST = withAuth('crm:convertir', async (req, { usuario }) => {
  const segments = req.nextUrl.pathname.split('/');
  const id = segments[segments.indexOf('leads') + 1];
  try {
    const result = await crmService.convertirLead(id, usuario.id);
    return apiOk(result, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
