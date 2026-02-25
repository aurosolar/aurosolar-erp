import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts[parts.length - 2]; // /api/contactos/[id]/convertir
  try {
    const cliente = await crm.convertirACliente(id, usuario.id);
    return apiOk(cliente);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
