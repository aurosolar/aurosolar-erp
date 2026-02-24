// src/app/api/activos/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as activosService from '@/services/activos.service';

export const GET = withAuth('activos:ver', async () => {
  const resumen = await activosService.resumenActivos();
  return apiOk(resumen);
});
