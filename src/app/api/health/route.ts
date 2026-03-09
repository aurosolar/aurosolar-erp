// src/app/api/health/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown',
      db: 'connected',
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
      error: e.message,
    }, { status: 503 });
  }
}
