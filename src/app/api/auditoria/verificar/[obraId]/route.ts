// src/app/api/auditoria/verificar/[obraId]/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { verificarCadena } from '@/services/auditoria-hmac.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('auditoria:ver', async (req) => {
  const obraId = req.nextUrl.pathname.split('/').pop()!;
  if (!obraId || obraId.length < 10) return apiError('obraId inválido', 400);

  const resultado = await verificarCadena(obraId);
  return apiOk(resultado);
});
