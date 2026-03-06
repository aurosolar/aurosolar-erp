// POST /api/jornada/sesion/retomar
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const body = await req.json();
    if (!body.obraId) return apiError('obraId requerido', 400);

    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa) return apiError('No hay jornada activa', 400);

    const sesion = await jornadaService.retomarSesion(usuario.id, activa.shift.id, body.obraId);
    return apiOk(sesion, 201);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
