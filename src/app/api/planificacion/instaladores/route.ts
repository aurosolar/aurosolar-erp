// GET /api/planificacion/instaladores
import { withAuth, apiOk } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('planificacion:ver', async () => {
  const instaladores = await planService.listarInstaladores();
  return apiOk(instaladores);
});
