// src/app/api/crm/pipeline/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as crmService from '@/services/crm.service';

export const GET = withAuth('crm:ver', async () => {
  const pipeline = await crmService.pipelineResumen();
  return apiOk(pipeline);
});
