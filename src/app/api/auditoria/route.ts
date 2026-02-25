// src/app/api/auditoria/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as auditoriaService from '@/services/auditoria.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('config:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const filtros = {
    obraId: searchParams.get('obraId') || undefined,
    usuarioId: searchParams.get('usuarioId') || undefined,
    entidad: searchParams.get('entidad') || undefined,
    accion: searchParams.get('accion') || undefined,
    desde: searchParams.get('desde') || undefined,
    hasta: searchParams.get('hasta') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
  };
  const datos = await auditoriaService.listar(filtros);
  return apiOk(datos);
});
