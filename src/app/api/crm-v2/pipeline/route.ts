import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';
export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  let comercialId = searchParams.get('comercialId') || undefined;
  // Comerciales solo ven su pipeline
  if (usuario.rol === 'COMERCIAL') comercialId = usuario.id;
  const data = await crm.obtenerPipeline(comercialId);
  return apiOk(data);
});
