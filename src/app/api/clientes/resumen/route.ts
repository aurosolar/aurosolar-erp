// src/app/api/clientes/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as clienteService from '@/services/clientes.service';

export const GET = withAuth('obras:ver', async () => {
  const resumen = await clienteService.resumen();
  return apiOk(resumen);
});
