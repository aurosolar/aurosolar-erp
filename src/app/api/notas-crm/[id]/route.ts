import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('crm:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { fijada } = await req.json();
  const nota = await crm.fijarNota(id, fijada);
  return apiOk(nota);
});

export const DELETE = withAuth('crm:editar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  await crm.eliminarNota(id);
  return apiOk({ deleted: true });
});
