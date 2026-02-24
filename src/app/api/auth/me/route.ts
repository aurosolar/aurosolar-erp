// src/app/api/auth/me/route.ts
import { getSession } from '@/lib/auth';
import { apiOk, apiError } from '@/lib/api';

export async function GET() {
  const usuario = await getSession();
  if (!usuario) return apiError('No autenticado', 401);
  return apiOk(usuario);
}
