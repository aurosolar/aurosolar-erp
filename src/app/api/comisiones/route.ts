// src/app/api/comisiones/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as comService from '@/services/comisiones.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('dashboard:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') || undefined;
  const datos = await comService.listar({ estado });
  return apiOk(datos);
});
