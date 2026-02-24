// src/app/api/portal/obras/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as portalService from '@/services/portal.service';

export const GET = withAuth('portal:ver', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiError('Sin acceso', 403);
  const id = req.nextUrl.pathname.split('/').pop()!;
  const obra = await portalService.detalleObra(id, usuario.clienteId);
  if (!obra) return apiError('Obra no encontrada', 404);
  return apiOk(obra);
});
