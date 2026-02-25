// src/app/api/validacion-avanzada/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as valService from '@/services/validacion-avanzada.service';

export const GET = withAuth('obras:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  if (obraId) {
    // Pre-carga datos obra
    try {
      const datos = await valService.datosPreCarga(obraId);
      return apiOk(datos);
    } catch (e) {
      return apiError(e instanceof Error ? e.message : 'Error', 422);
    }
  }
  const lista = await valService.listar();
  return apiOk(lista);
});

export const POST = withAuth('campo:validar', async (req, { usuario }) => {
  try {
    const body = await req.json();
    const result = await valService.guardarValidacion(body, usuario.id);
    return apiOk(result, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
