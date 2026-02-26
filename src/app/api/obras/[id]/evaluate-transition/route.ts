// GET /api/obras/[id]/evaluate-transition?to=ESTADO
// Pre-evalúa una transición SIN ejecutarla.
// Usado por el frontend para mostrar gates antes de intentar cambio.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateTransition } from '@/services/gate-engine';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const to = req.nextUrl.searchParams.get('to');
    if (!to) {
      return NextResponse.json(
        { ok: false, error: 'Parámetro "to" requerido (estado destino)' },
        { status: 400 },
      );
    }

    const nota = req.nextUrl.searchParams.get('nota') || undefined;

    const result = await evaluateTransition(
      params.id,
      to as any,
      session.user.id,
      session.user.rol,
      nota,
    );

    // No devolver el objeto obra completo al frontend
    const { obra, ...evaluationResult } = result;

    return NextResponse.json({
      ok: true,
      data: {
        obraId: params.id,
        from: obra.estado,
        to,
        ...evaluationResult,
      },
    });
  } catch (error) {
    logger.error('evaluate_transition_error', {
      obraId: params.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ok: false, error: 'Error al evaluar transición' },
      { status: 500 },
    );
  }
}
