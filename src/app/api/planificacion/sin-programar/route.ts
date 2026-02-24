// src/app/api/planificacion/sin-programar/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const GET = withAuth('planificacion:ver', async () => {
  const obras = await planService.obrasSinProgramar();
  return apiOk(obras);
});
