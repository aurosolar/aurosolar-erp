// GET /api/jornada/pausadas
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (_req, { usuario }) => {
  try {
    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa) return apiOk([]);

    const pausadas = await jornadaService.sesionesPausadas(activa.shift.id);
    return apiOk(pausadas);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
