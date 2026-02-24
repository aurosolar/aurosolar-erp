// src/app/api/rentabilidad/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as rentService from '@/services/rentabilidad.service';

export const GET = withAuth('dashboard:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
  const data = await rentService.resumenRentabilidad({ desde, hasta });
  return apiOk(data);
});
