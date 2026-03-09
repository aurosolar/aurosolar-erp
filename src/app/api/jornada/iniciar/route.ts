// POST /api/jornada/iniciar
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await jornadaService.iniciarJornada(usuario.id, {
      lat: body.lat, lng: body.lng, obraId: body.obraId, nota: body.nota,
    });
    return apiOk(result, 201);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
