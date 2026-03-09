// src/app/api/cron/purge-sessions/route.ts
// Llamar periódicamente desde un cron (crontab, PM2 timer, etc.)
// Ejemplo crontab: 0 3 * * * curl -s -X POST https://app.aurosolar.es/api/cron/purge-sessions -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest } from 'next/server';
import { purgeExpiredSessions } from '@/lib/auth';
import { apiOk, apiError } from '@/lib/api';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Proteger con secret simple para que no sea público
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || auth !== expected) {
    return apiError('No autorizado', 401);
  }

  const deleted = await purgeExpiredSessions();
  logger.info('cron_purge_sessions', { deleted });

  return apiOk({ deleted });
}
