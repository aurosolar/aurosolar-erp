// src/app/api/crm/ranking/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as crmService from '@/services/crm.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('dashboard:ver', async () => {
  const ranking = await crmService.rankingComerciales();
  return apiOk(ranking);
});
