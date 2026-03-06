// PATCH /api/jornada/sesion/cerrar
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const cierreTipo = body.cierreTipo || undefined; // PARTE, VALIDACION, PAUSA

    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa?.sesionActiva) return apiError('No hay sesión activa', 400);

    const result = await jornadaService.cerrarSesion(activa.sesionActiva.id, cierreTipo);
    return apiOk(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
