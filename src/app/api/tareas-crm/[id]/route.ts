// src/app/api/tareas-crm/[id]/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const PATCH = withAuth('tareas-crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const body = await req.json();
  if (body.estado === 'COMPLETADA') {
    const tarea = await crmV2.completarTarea(id, usuario.id);
    return apiOk(tarea);
  }
  const tarea = await crmV2.actualizarTarea(id, body);
  return apiOk(tarea);
});
