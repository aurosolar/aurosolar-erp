// src/app/api/subvenciones/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as subService from '@/services/subvenciones.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const datos = await subService.listar({ estado, tipo });
  return apiOk(datos);
});

export const POST = withAuth('obras:editar', async (req, { usuario }) => {
  try {
    const body = await req.json();
    const sub = await subService.crear(body, usuario.id);
    return apiOk(sub, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
