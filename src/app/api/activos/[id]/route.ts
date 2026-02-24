// src/app/api/activos/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as activosService from '@/services/activos.service';

export const GET = withAuth('activos:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const activo = await activosService.detalleActivo(id);
  if (!activo) return apiError('No encontrado', 404);
  return apiOk(activo);
});
