// src/app/api/subvenciones/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as subService from '@/services/subvenciones.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const sub = await subService.detalle(id);
  if (!sub) return apiError('No encontrada', 404);
  return apiOk(sub);
});

export const PATCH = withAuth('obras:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const body = await req.json();
    const { estado, ...datos } = body;
    const sub = await subService.cambiarEstado(id, estado, datos, usuario.id);
    return apiOk(sub);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
