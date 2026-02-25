// src/app/api/crm/dashboard/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as crmService from '@/services/crm.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const comercialId = usuario.rol === 'COMERCIAL' ? usuario.id : (searchParams.get('comercialId') || usuario.id);
  const dashboard = await crmService.dashboardComercial(comercialId);
  return apiOk(dashboard);
});
