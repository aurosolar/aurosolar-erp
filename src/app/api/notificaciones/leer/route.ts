// src/app/api/notificaciones/leer/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as notifService from '@/services/notificaciones.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().uuid().optional(), // Si se pasa id, marca solo esa. Si no, todas.
});

export const POST = withAuth('obras:ver', async (req, { usuario }) => {
  try {
    const body = await req.json();
    const { id } = await schema.parseAsync(body);
    if (id) {
      await notifService.marcarLeida(id, usuario.id);
    } else {
      await notifService.marcarTodasLeidas(usuario.id);
    }
    return apiOk({ ok: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
