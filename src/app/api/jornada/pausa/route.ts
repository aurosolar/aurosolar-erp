// POST /api/jornada/pausa — toggle pausa
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('campo:checkin', async (_req, { usuario }) => {
  try {
    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa) return apiError('No hay jornada activa', 400);

    const result = await jornadaService.togglePausa(activa.shift.id);
    return apiOk(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
