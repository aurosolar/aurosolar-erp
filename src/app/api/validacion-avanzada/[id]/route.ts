// src/app/api/validacion-avanzada/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as valService from '@/services/validacion-avanzada.service';

export const GET = withAuth('obras:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const detalle = await valService.detalle(id);
  if (!detalle) return apiError('No encontrada', 404);
  return apiOk(detalle);
});
