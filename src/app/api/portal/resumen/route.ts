// src/app/api/portal/resumen/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as portalService from '@/services/portal.service';

export const GET = withAuth('portal:ver', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiError('Sin acceso', 403);
  const resumen = await portalService.resumenCliente(usuario.clienteId);
  return apiOk(resumen);
});
