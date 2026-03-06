// src/app/api/planificacion/schedule/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as planService from '@/services/planificacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('planificacion:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d;
  })();
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : (() => {
    const d = new Date(desde); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d;
  })();
  const schedule = await planService.listarSchedule(desde, hasta);
  return apiOk(schedule);
});
