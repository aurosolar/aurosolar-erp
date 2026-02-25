// src/app/api/contactos/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const filtros: any = {};
  if (searchParams.get('estado')) filtros.estado = searchParams.get('estado');
  if (searchParams.get('comercialId')) filtros.comercialId = searchParams.get('comercialId');
  if (searchParams.get('q')) filtros.q = searchParams.get('q');
  if (usuario.rol === 'COMERCIAL' && searchParams.get('soloMios') === 'true') {
    filtros.comercialId = usuario.id;
  }
  const data = await crm.listarContactos(filtros);
  return apiOk(data);
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const body = await req.json();
  if (!body.nombre) return apiError('Nombre requerido', 400);
  if (usuario.rol === 'COMERCIAL' && !body.comercialId) body.comercialId = usuario.id;
  const contacto = await crm.crearContacto(body, usuario.id);
  return apiOk(contacto, 201);
});
