// src/app/api/auditoria/resumen/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as auditoriaService from '@/services/auditoria.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('config:ver', async () => {
  const [resumen, entidades, acciones] = await Promise.all([
    auditoriaService.resumen(),
    auditoriaService.entidadesUnicas(),
    auditoriaService.accionesUnicas(),
  ]);
  return apiOk({ ...resumen, entidades, acciones });
});
