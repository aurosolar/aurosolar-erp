import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth('crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { estado, motivoPerdido } = await req.json();
  if (!estado) return apiError('estado requerido', 400);
  try {
    const trato = await crm.avanzarTrato(id, estado, usuario.id, { motivoPerdido });
    return apiOk(trato);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
