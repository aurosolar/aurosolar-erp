// src/app/api/cobros/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as cobrosService from '@/services/cobros.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('cobros:ver', async () => {
  const resumen = await cobrosService.resumenMensual();
  return apiOk(resumen);
});
