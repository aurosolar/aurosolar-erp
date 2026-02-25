// src/app/api/configuracion/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as configService from '@/services/configuracion.service';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  orden: z.number().int().optional(),
  activo: z.boolean().optional(),
  metadata: z.string().optional(),
});

export const PATCH = withAuth('config:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = await updateSchema.parseAsync(await req.json());
    const catalogo = await configService.actualizarCatalogo(id, input);
    return apiOk(catalogo);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});

export const DELETE = withAuth('config:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    await configService.eliminarCatalogo(id);
    return apiOk({ ok: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
