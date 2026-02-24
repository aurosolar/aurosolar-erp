// src/app/api/planificacion/disponibilidad/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const GET = withAuth('planificacion:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha') ? new Date(searchParams.get('fecha')!) : new Date();
  const disponibilidad = await planService.instaladoresDisponibles(fecha);
  return apiOk(disponibilidad);
});
