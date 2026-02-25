// src/app/api/configuracion/seed/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as configService from '@/services/configuracion.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('config:ver', async () => {
  try {
    const result = await configService.seedCatalogos();
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 500);
  }
});
