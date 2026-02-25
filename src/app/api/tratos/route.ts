import { withAuth, apiOk, apiError } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const filtros: any = {};
  if (searchParams.get('contactoId')) filtros.contactoId = searchParams.get('contactoId');
  if (searchParams.get('estado')) filtros.estado = searchParams.get('estado');
  if (searchParams.get('comercialId')) filtros.comercialId = searchParams.get('comercialId');
  if (usuario.rol === 'COMERCIAL') filtros.comercialId = usuario.id;
  const data = await crm.listarTratos(filtros);
  return apiOk(data);
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const body = await req.json();
  const trato = await crm.crearTrato(body, usuario.id);
  return apiOk(trato, 201);
});
