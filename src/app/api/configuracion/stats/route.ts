// src/app/api/configuracion/stats/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as configService from '@/services/configuracion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('config:ver', async () => {
  const stats = await configService.estadisticasSistema();
  return apiOk(stats);
});
