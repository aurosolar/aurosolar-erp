// src/app/api/portal/soporte/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError, parseBody } from '@/lib/api';
import * as portalService from '@/services/portal.service';

export const dynamic = 'force-dynamic';

const ticketSchema = z.object({
  obraId: z.string().uuid(),
  descripcion: z.string().min(10, 'Mínimo 10 caracteres'),
});

export const POST = withAuth('portal:soporte', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiError('Sin acceso', 403);
  const input = await parseBody(req, ticketSchema);
  try {
    const ticket = await portalService.crearTicketSoporte(input, usuario.clienteId);
    return apiOk(ticket, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
