// PATCH /api/obras/[id]/checklist/[checklistId]/submit
// ═══════════════════════════════════════════
// El instalador ENVÍA el checklist para revisión.
// BORRADOR|RECHAZADA → SUBMITIDA
// NO transiciona estado de obra (eso es PATCH /api/obras/[id])
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; checklistId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    // Cargar checklist con items
    const checklist = await prisma.checklistValidacion.findUnique({
      where: { id: params.checklistId },
      include: {
        items: { select: { codigo: true, critico: true, respuesta: true } },
      },
    });

    if (!checklist) {
      return NextResponse.json({ ok: false, error: 'Checklist no encontrado' }, { status: 404 });
    }

    if (checklist.obraId !== params.id) {
      return NextResponse.json({ ok: false, error: 'Checklist no pertenece a esta obra' }, { status: 400 });
    }

    // Solo se puede enviar desde BORRADOR o RECHAZADA
    if (checklist.status !== 'BORRADOR' && checklist.status !== 'RECHAZADA') {
      return NextResponse.json(
        { ok: false, error: `No se puede enviar desde estado ${checklist.status}. Solo BORRADOR o RECHAZADA.` },
        { status: 422 },
      );
    }

    // Validar que todos los ítems tienen respuesta
    const sinRespuesta = checklist.items.filter(i => !i.respuesta || i.respuesta === '');
    if (sinRespuesta.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Hay ${sinRespuesta.length} ítem(s) sin respuesta`,
        data: {
          itemsSinRespuesta: sinRespuesta.map(i => i.codigo),
        },
      }, { status: 422 });
    }

    // Validar serial inversor
    if (!checklist.serialInversor) {
      return NextResponse.json({
        ok: false,
        error: 'Se requiere serial del inversor antes de enviar',
        data: { action: { type: 'EDIT_FIELD', field: 'serialInversor', label: 'Registrar serial' } },
      }, { status: 422 });
    }

    // Calcular resultado basado en ítems críticos
    const criticosFallidos = checklist.items.filter(i => i.critico && i.respuesta === 'NO');
    const tieneObservaciones = checklist.items.some(i => i.respuesta === 'OBSERVACION');
    let resultado: string;
    if (criticosFallidos.length > 0) {
      resultado = 'NO_OK';
    } else if (tieneObservaciones) {
      resultado = 'OK_CON_OBS';
    } else {
      resultado = 'OK';
    }

    // Actualizar: BORRADOR/RECHAZADA → SUBMITIDA
    const updated = await prisma.checklistValidacion.update({
      where: { id: params.checklistId },
      data: {
        status: 'SUBMITIDA',
        resultado,
        submittedAt: new Date(),
        submittedById: session.user.id,
        // Limpiar campos de review anterior (si viene de RECHAZADA)
        reviewedAt: null,
        reviewedById: null,
        reviewDecision: null,
        reviewNotes: null,
      },
    });

    // Auditoría
    await prisma.actividad.create({
      data: {
        obraId: params.id,
        usuarioId: session.user.id,
        accion: 'CHECKLIST_SUBMITIDA',
        entidad: 'checklistValidacion',
        entidadId: params.checklistId,
        detalle: JSON.stringify({
          resultado,
          criticosFallidos: criticosFallidos.length,
          totalItems: checklist.items.length,
        }),
      },
    });

    logger.info('checklist_submitted', {
      obraId: params.id, checklistId: params.checklistId,
      resultado, usuario: session.user.email,
    });

    return NextResponse.json({
      ok: true,
      data: {
        checklist: updated,
        resultado,
        mensaje: 'Checklist enviado para revisión del coordinador',
      },
    });
  } catch (error) {
    logger.error('checklist_submit_error', {
      obraId: params.id, checklistId: params.checklistId,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ok: false, error: 'Error al enviar checklist' },
      { status: 500 },
    );
  }
}
