// src/app/api/contactos/[id]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const GET = withAuth('crm:ver', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const data = await crm.obtenerContacto(id);
  if (!data) return apiError('No encontrado', 404);
  return apiOk(data);
});

export const PATCH = withAuth('crm:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const body = await req.json();
  const data = await crm.actualizarContacto(id, body, usuario.id);
  return apiOk(data);
});
