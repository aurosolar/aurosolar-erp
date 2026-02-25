// src/app/api/portal/obras/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as portalService from '@/services/portal.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('portal:ver', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiOk([]);
  const obras = await portalService.misObras(usuario.clienteId);
  return apiOk(obras);
});
