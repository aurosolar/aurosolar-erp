// src/app/api/subvenciones/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as subService from '@/services/subvenciones.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async () => {
  const resumen = await subService.resumen();
  return apiOk(resumen);
});
