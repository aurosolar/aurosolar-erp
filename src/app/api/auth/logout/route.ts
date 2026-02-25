// src/app/api/auth/logout/route.ts
import { clearSession } from '@/lib/auth';
import { apiOk } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSession();
  return apiOk({ message: 'Sesión cerrada' });
}
