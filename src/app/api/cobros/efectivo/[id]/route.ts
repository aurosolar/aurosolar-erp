// src/app/api/cobros/efectivo/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as cobrosService from '@/services/cobros.service';

export const PATCH = withAuth('cobros:registrar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const pago = await cobrosService.confirmarEfectivo(id, usuario.id);
    return apiOk(pago);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Error', 422);
  }
});
