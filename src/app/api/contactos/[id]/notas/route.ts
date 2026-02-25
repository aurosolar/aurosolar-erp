import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts[parts.length - 2]; // /api/contactos/[id]/notas
  const { contenido } = await req.json();
  if (!contenido) return apiError('Contenido requerido', 400);
  const nota = await crm.crearNota(id, contenido, usuario.id);
  return apiOk(nota, 201);
});
