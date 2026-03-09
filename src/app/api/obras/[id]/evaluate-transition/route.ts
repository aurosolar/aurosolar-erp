import { withAuth, apiOk, apiError } from '@/lib/api';
import { evaluateTransition } from '@/services/gate-engine';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').filter(Boolean);
  const obraId = id[id.indexOf('obras') + 1];
  const to = req.nextUrl.searchParams.get('to');
  if (!to) return apiError('Parámetro "to" requerido', 400);

  try {
    const result = await evaluateTransition(obraId, to as any, usuario.id, usuario.rol as any, req.nextUrl.searchParams.get('nota') || undefined);
    const { obra, ...rest } = result;
    return apiOk({ obraId, from: obra.estado, to, ...rest });
  } catch (error) {
    logger.error('evaluate_transition_error', { obraId, error: error instanceof Error ? error.message : error });
    return apiError('Error al evaluar transición', 500);
  }
});
