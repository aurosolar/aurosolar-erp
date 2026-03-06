// GET /api/jornada/tiempo-obra?obraId=xxx
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const { searchParams } = new URL(req.url);
    const obraId = searchParams.get('obraId');
    if (!obraId) return apiError('obraId requerido', 400);

    const activa = await jornadaService.jornadaActiva(usuario.id);
    if (!activa) return apiOk({ trabajoMin: 0, esperaMin: 0, totalMin: 0 });

    const tiempo = await jornadaService.tiempoEnObraHoy(activa.shift.id, obraId);
    return apiOk(tiempo);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
