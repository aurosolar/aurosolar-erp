// src/app/api/cobros/alertas/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as cobrosService from '@/services/cobros.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('cobros:ver', async () => {
  const alertas = await cobrosService.obtenerAlertas();
  return apiOk(alertas);
});
