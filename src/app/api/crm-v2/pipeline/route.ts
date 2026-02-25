import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const comercialId = searchParams.get('comercialId') || undefined;
  const data = await crm.obtenerPipeline(comercialId);
  return apiOk(data);
});
