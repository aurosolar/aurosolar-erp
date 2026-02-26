// PATCH /api/obras/[id]
// ═══════════════════════════════════════════
// REGLA: TODO cambio de estado pasa por executeTransition(). CERO bypasses.
// También permite editar campos de la obra (sin cambio de estado).
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeTransition, getTransicionesDisponibles } from '@/services/gate-engine';
import logger from '@/lib/logger';

// Campos editables directamente (sin pasar por gate-engine)
const CAMPOS_EDITABLES = [
  'clienteId', 'presupuestoTotal', 'costeTotal',
  'fechaProgramada', 'direccionInstalacion',
  'expedienteLegal', 'estadoLegalizacion',
  'potenciaKw', 'tipoInstalacion', 'descripcion',
  'coordenadasLat', 'coordenadasLng',
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { estado, nota, override, ...campos } = body;

    // ═══ CASO 1: Cambio de estado → executeTransition ═══
    if (estado) {
      const result = await executeTransition(
        params.id,
        estado,
        session.user.id,
        session.user.rol,
        nota,
        override === true, // Forzar booleano
      );

      if (!result.ok) {
        // Determinar código HTTP según el tipo de fallo
        const esPermisos = result.result.reasons.some(r =>
          r.includes('permisos') || r.includes('override'));
        return NextResponse.json(
          { ok: false, error: 'Transición bloqueada', data: result.result },
          { status: esPermisos ? 403 : 422 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          obra: result.obra,
          transicionesDisponibles: result.transicionesDisponibles,
        },
      });
    }

    // ═══ CASO 2: Edición de campos (sin cambio de estado) ═══
    const updateData: Record<string, any> = {};
    for (const key of CAMPOS_EDITABLES) {
      if (key in campos && campos[key] !== undefined) {
        updateData[key] = campos[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No se proporcionaron campos válidos para actualizar' },
        { status: 400 },
      );
    }

    const obra = await prisma.obra.update({
      where: { id: params.id },
      data: updateData,
    });

    // Auditoría de edición
    await prisma.actividad.create({
      data: {
        obraId: params.id,
        usuarioId: session.user.id,
        accion: 'OBRA_EDITADA',
        entidad: 'obra',
        entidadId: params.id,
        detalle: JSON.stringify({ campos: Object.keys(updateData) }),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        obra,
        transicionesDisponibles: getTransicionesDisponibles(obra.estado, session.user.rol),
      },
    });
  } catch (error) {
    logger.error('patch_obra_error', {
      obraId: params.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ok: false, error: 'Error al actualizar obra' },
      { status: 500 },
    );
  }
}
