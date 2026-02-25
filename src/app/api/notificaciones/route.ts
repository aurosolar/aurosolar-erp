// src/app/api/notificaciones/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as notifService from '@/services/notificaciones.service';

export const dynamic = 'force-dynamic';

// GET: listar notificaciones del usuario logueado
export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const soloNoLeidas = searchParams.get('noLeidas') === '1';
  const notificaciones = await notifService.listar(usuario.id, soloNoLeidas);
  return apiOk(notificaciones);
});
