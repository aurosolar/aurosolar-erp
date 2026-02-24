// src/app/api/notificaciones/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as notifService from '@/services/notificaciones.service';

// GET: listar notificaciones del usuario logueado
export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const soloNoLeidas = searchParams.get('noLeidas') === '1';
  const notificaciones = await notifService.listar(usuario.id, soloNoLeidas);
  return apiOk(notificaciones);
});
