// src/app/api/notificaciones/count/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as notifService from '@/services/notificaciones.service';

export const GET = withAuth('obras:ver', async (_req, { usuario }) => {
  const count = await notifService.contarNoLeidas(usuario.id);
  return apiOk({ count });
});
