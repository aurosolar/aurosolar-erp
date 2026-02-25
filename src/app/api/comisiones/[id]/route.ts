// src/app/api/comisiones/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as comService from '@/services/comisiones.service';

export const PATCH = withAuth('dashboard:ver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const com = await comService.marcarPagada(id, usuario.id);
    return apiOk(com);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
