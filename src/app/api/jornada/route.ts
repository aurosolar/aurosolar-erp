// GET /api/jornada — jornada activa del empleado
import { withAuth, apiOk } from '@/lib/api';
import * as jornadaService from '@/services/jornada.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (_req, { usuario }) => {
  const data = await jornadaService.jornadaActiva(usuario.id);
  return apiOk(data);
});
