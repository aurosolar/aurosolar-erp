// src/app/api/export/gdpr/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as exportService from '@/services/export.service';

export const dynamic = 'force-dynamic';

// GET: Export all data for a client (GDPR right of access)
export const GET = withAuth('config:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get('clienteId');
  if (!clienteId) return apiError('clienteId requerido', 422);
  try {
    const datos = await exportService.exportarDatosCliente(clienteId);
    return apiOk(datos);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});

// POST: Anonymize a client (GDPR right to be forgotten)
export const POST = withAuth('config:ver', async (req, { usuario }) => {
  const body = await req.json();
  if (!body.clienteId) return apiError('clienteId requerido', 422);
  if (!body.confirmacion) return apiError('Debe confirmar con confirmacion: true', 422);
  try {
    const result = await exportService.anonimizarCliente(body.clienteId, usuario.id);
    return apiOk(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
