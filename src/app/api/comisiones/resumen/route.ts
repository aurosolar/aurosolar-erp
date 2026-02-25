// src/app/api/comisiones/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as comService from '@/services/comisiones.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('dashboard:ver', async () => {
  const resumen = await comService.resumen();
  return apiOk(resumen);
});
