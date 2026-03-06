// PATCH /api/jornada/finalizar
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await jornadaService.finalizarJornada(usuario.id, {
      lat: body.lat, lng: body.lng, nota: body.nota,
    });
    return apiOk(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
