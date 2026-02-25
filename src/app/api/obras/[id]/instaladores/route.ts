// src/app/api/obras/[id]/instaladores/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError, parseBody } from '@/lib/api';
import * as obrasService from '@/services/obras.service';

export const dynamic = 'force-dynamic';

const asignarSchema = z.object({
  instaladorIds: z.array(z.string().uuid()).min(1, 'Se requiere al menos un instalador'),
});

// PUT /api/obras/[id]/instaladores — Asignar instaladores
export const PUT = withAuth('obras:editar', async (req, { usuario }) => {
  const pathParts = req.nextUrl.pathname.split('/');
  const obraId = pathParts[pathParts.indexOf('obras') + 1];
  const { instaladorIds } = await parseBody(req, asignarSchema);

  try {
    await obrasService.asignarInstaladores(obraId, instaladorIds, usuario.id);
    return apiOk({ message: 'Instaladores asignados correctamente' });
  } catch (error) {
    if (error instanceof Error) return apiError(error.message, 422);
    throw error;
  }
});
