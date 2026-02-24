// src/app/api/documentos/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as docService from '@/services/documentos.service';

export const DELETE = withAuth('obras:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    await docService.eliminar(id);
    return apiOk({ ok: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});

export const PATCH = withAuth('obras:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const doc = await docService.toggleVisible(id);
    return apiOk(doc);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
