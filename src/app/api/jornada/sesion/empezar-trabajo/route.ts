// PATCH /api/jornada/sesion/empezar-trabajo
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('campo:checkin', async (_req, { usuario }) => {
  try {
    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa?.sesionActiva) return apiError('No hay sesi\u00f3n activa', 400);

    const result = await jornadaService.cambiarEsperaATrabajo(activa.sesionActiva.id);
    return apiOk(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
