// PATCH /api/obras/[id]/checklist/[checklistId]/review
// ═══════════════════════════════════════════
// El coordinador APRUEBA o RECHAZA el checklist.
// SUBMITIDA → APROBADA|RECHAZADA
// Si APROBADA: auto-crea registros ActivoInstalado
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ROLES_REVIEW = ['ADMIN', 'JEFE_INSTALACIONES', 'COORDINADOR', 'OFICINA'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; checklistId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    if (!ROLES_REVIEW.includes(session.user.rol)) {
      return NextResponse.json(
        { ok: false, error: 'No tiene permisos para revisar validaciones' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { decision, notes } = body;

    if (!decision || !['APROBADA', 'RECHAZADA'].includes(decision)) {
      return NextResponse.json(
        { ok: false, error: 'decision debe ser APROBADA o RECHAZADA' },
        { status: 400 },
      );
    }

    // Rechazo requiere notas
    if (decision === 'RECHAZADA' && (!notes || notes.trim().length < 10)) {
      return NextResponse.json({
        ok: false,
        error: 'El rechazo requiere notas explicativas (mín. 10 caracteres)',
        data: { action: { type: 'INPUT', field: 'notes', label: 'Escribir motivo del rechazo' } },
      }, { status: 422 });
    }

    const checklist = await prisma.checklistValidacion.findUnique({
      where: { id: params.checklistId },
    });

    if (!checklist) {
      return NextResponse.json({ ok: false, error: 'Checklist no encontrado' }, { status: 404 });
    }
    if (checklist.obraId !== params.id) {
      return NextResponse.json({ ok: false, error: 'Checklist no pertenece a esta obra' }, { status: 400 });
    }
    if (checklist.status !== 'SUBMITIDA') {
      return NextResponse.json(
        { ok: false, error: `Solo se puede revisar un checklist SUBMITIDO. Estado actual: ${checklist.status}` },
        { status: 422 },
      );
    }

    // Actualizar checklist
    const updated = await prisma.checklistValidacion.update({
      where: { id: params.checklistId },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        reviewDecision: decision,
        reviewNotes: notes?.trim() || null,
      },
    });

    // Auditoría
    const accion = decision === 'APROBADA' ? 'CHECKLIST_APROBADA' : 'CHECKLIST_RECHAZADA';
    await prisma.actividad.create({
      data: {
        obraId: params.id,
        usuarioId: session.user.id,
        accion,
        entidad: 'checklistValidacion',
        entidadId: params.checklistId,
        detalle: JSON.stringify({
          decision,
          notes: notes?.trim() || null,
          resultado: checklist.resultado,
        }),
      },
    });

    // Si APROBADA: crear activos instalados automáticamente
    if (decision === 'APROBADA') {
      try {
        await crearActivosDesdeChecklist(params.id, params.checklistId, session.user.id);
      } catch (e) {
        logger.error('auto_activos_error', {
          obraId: params.id, checklistId: params.checklistId,
          error: e instanceof Error ? e.message : e,
        });
        // No bloquear la aprobación por fallo de auto-activos
      }
    }

    // Notificar al instalador que envió
    if (checklist.submittedById) {
      try {
        const obra = await prisma.obra.findUnique({
          where: { id: params.id },
          select: { codigo: true },
        });
        await prisma.notificacion.create({
          data: {
            usuarioId: checklist.submittedById,
            titulo: decision === 'APROBADA'
              ? `✅ Validación aprobada — ${obra?.codigo}`
              : `❌ Validación rechazada — ${obra?.codigo}`,
            mensaje: decision === 'APROBADA'
              ? 'La validación técnica ha sido aprobada.'
              : `Motivo: ${notes?.trim()}`,
            tipo: accion,
            enlace: `/obras/${params.id}?tab=validacion`,
            entidadTipo: 'checklistValidacion',
            entidadId: params.checklistId,
          },
        });
      } catch (e) {
        logger.error('notif_review_error', { obraId: params.id, error: e });
      }
    }

    logger.info('checklist_reviewed', {
      obraId: params.id, checklistId: params.checklistId,
      decision, reviewer: session.user.email,
    });

    return NextResponse.json({
      ok: true,
      data: {
        checklist: updated,
        decision,
        mensaje: decision === 'APROBADA'
          ? 'Validación aprobada. Activos registrados automáticamente.'
          : 'Validación rechazada. El instalador será notificado.',
      },
    });
  } catch (error) {
    logger.error('checklist_review_error', {
      obraId: params.id, checklistId: params.checklistId,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ok: false, error: 'Error al revisar checklist' },
      { status: 500 },
    );
  }
}

// ── Auto-crear activos desde datos de checklist ──
async function crearActivosDesdeChecklist(
  obraId: string,
  checklistId: string,
  userId: string,
) {
  const checklist = await prisma.checklistValidacion.findUnique({
    where: { id: checklistId },
    select: {
      serialInversor: true,
      serialBateria: true,
      marcaInversor: true,
      modeloInversor: true,
      potenciaInversor: true,
      marcaBateria: true,
      modeloBateria: true,
      capacidadBateria: true,
    },
  });
  if (!checklist) return;

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { clienteId: true },
  });

  const activos: Array<{ tipo: string; serial: string | null; marca: string | null; modelo: string | null; extra?: Record<string, any> }> = [];

  if (checklist.serialInversor) {
    activos.push({
      tipo: 'INVERSOR',
      serial: checklist.serialInversor,
      marca: checklist.marcaInversor,
      modelo: checklist.modeloInversor,
      extra: checklist.potenciaInversor ? { potencia: checklist.potenciaInversor } : undefined,
    });
  }

  if (checklist.serialBateria) {
    activos.push({
      tipo: 'BATERIA',
      serial: checklist.serialBateria,
      marca: checklist.marcaBateria,
      modelo: checklist.modeloBateria,
      extra: checklist.capacidadBateria ? { capacidad: checklist.capacidadBateria } : undefined,
    });
  }

  for (const a of activos) {
    // Evitar duplicados por serial
    const existe = a.serial ? await prisma.activoInstalado.findFirst({
      where: { serialNumber: a.serial },
    }) : null;

    if (!existe) {
      await prisma.activoInstalado.create({
        data: {
          obraId,
          clienteId: obra?.clienteId || null,
          tipo: a.tipo,
          serialNumber: a.serial,
          marca: a.marca,
          modelo: a.modelo,
          fechaInstalacion: new Date(),
          metadata: a.extra ? JSON.stringify(a.extra) : null,
          creadoPorId: userId,
        },
      });
    }
  }

  if (activos.length > 0) {
    await prisma.actividad.create({
      data: {
        obraId,
        usuarioId: userId,
        accion: 'ACTIVOS_AUTO_CREADOS',
        entidad: 'activoInstalado',
        entidadId: obraId,
        detalle: JSON.stringify({
          activos: activos.map(a => ({ tipo: a.tipo, serial: a.serial })),
          origen: 'aprobacion_checklist',
        }),
      },
    });
  }
}
