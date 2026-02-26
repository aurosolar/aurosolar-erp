// POST /api/campo/checkin
// ═══════════════════════════════════════════
// Check-in de instalador en obra.
// Si obra PROGRAMADA → transiciona a INSTALANDO (atómico via $transaction).
// Si obra INSTALANDO/VALIDACION/REVISION → solo crea checkin.
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateCheckinTransition } from '@/services/gate-engine';
import logger from '@/lib/logger';

function apiOk(data: any, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function apiError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

const ESTADOS_CHECKIN_PERMITIDOS = [
  'PROGRAMADA', 'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR',
] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return apiError('No autorizado', 401);

    const body = await req.json();
    const input = {
      obraId: body.obraId as string,
      nota: body.nota as string | undefined,
      latitud: body.latitud as number | undefined,
      longitud: body.longitud as number | undefined,
    };

    if (!input.obraId) return apiError('obraId requerido', 400);

    // Cargar usuario e obra
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nombre: true, apellidos: true, email: true, rol: true },
    });
    if (!usuario) return apiError('Usuario no encontrado', 404);

    const obra = await prisma.obra.findUnique({
      where: { id: input.obraId },
      select: { id: true, estado: true, codigo: true },
    });
    if (!obra) return apiError('Obra no encontrada', 404);

    const nombreCompleto = `${usuario.nombre} ${usuario.apellidos || ''}`.trim();

    // ═══ Validar que el estado permite checkin ═══
    if (!ESTADOS_CHECKIN_PERMITIDOS.includes(obra.estado as any)) {
      return apiError(
        `No se puede hacer check-in en estado ${obra.estado}. Permitidos: ${ESTADOS_CHECKIN_PERMITIDOS.join(', ')}`,
        400,
      );
    }

    // ═══ CASO 1: PROGRAMADA → evaluar gates + transicionar atómicamente ═══
    if (obra.estado === 'PROGRAMADA') {
      const evaluation = await evaluateCheckinTransition(
        input.obraId,
        usuario.id,
        nombreCompleto,
      );

      if (!evaluation.allowed) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'No se puede iniciar jornada en esta obra',
          data: {
            allowed: false,
            reasons: evaluation.reasons,
            actions: evaluation.actions,
            gates: evaluation.gates,
          },
        }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      }

      // FIX 3: Operación atómica — checkin + transición + auditoría
      // Si cualquier paso falla → rollback completo.
      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Crear checkin
          const checkin = await tx.checkin.create({
            data: {
              obraId: input.obraId,
              instaladorId: usuario.id,
              horaEntrada: new Date(),
              nota: input.nota,
              latitud: input.latitud ?? null,
              longitud: input.longitud ?? null,
            },
          });

          // 2. Transicionar estado
          const obraActualizada = await tx.obra.update({
            where: { id: input.obraId },
            data: {
              estado: 'INSTALANDO',
              fechaInicio: new Date(),
            },
          });

          // 3. Auditoría: cambio de estado
          await tx.actividad.create({
            data: {
              obraId: input.obraId,
              usuarioId: usuario.id,
              accion: 'ESTADO_CAMBIADO',
              entidad: 'obra',
              entidadId: input.obraId,
              detalle: JSON.stringify({
                estadoAnterior: 'PROGRAMADA',
                nuevoEstado: 'INSTALANDO',
                nota: 'Check-in automático',
                gates: evaluation.gates.map(g => ({ gate: g.gate, passed: g.passed })),
              }),
            },
          });

          // 4. Auditoría: checkin
          await tx.actividad.create({
            data: {
              obraId: input.obraId,
              usuarioId: usuario.id,
              accion: 'CHECKIN_REGISTRADO',
              entidad: 'checkin',
              entidadId: checkin.id,
              detalle: JSON.stringify({
                nota: input.nota,
                transicion: { from: 'PROGRAMADA', to: 'INSTALANDO' },
              }),
            },
          });

          return { checkin, obraActualizada };
        });

        logger.info('checkin_con_transicion', {
          obraId: input.obraId, codigo: obra.codigo,
          instalador: usuario.email, transicion: true,
        });

        return apiOk({
          checkin: result.checkin,
          transicion: { from: 'PROGRAMADA', to: 'INSTALANDO' },
        }, 201);

      } catch (txError) {
        logger.error('checkin_transaccion_fallida', {
          obraId: input.obraId,
          error: txError instanceof Error ? txError.message : txError,
        });
        return apiError(
          'Error al registrar check-in y transicionar obra. No se han guardado cambios.',
          500,
        );
      }
    }

    // ═══ CASO 2: INSTALANDO / VALIDACION / REVISION → solo checkin ═══

    // Verificar no tiene jornada abierta en OTRA obra
    const jornadaOtra = await prisma.checkin.findFirst({
      where: { instaladorId: usuario.id, horaSalida: null, obraId: { not: input.obraId } },
      include: { obra: { select: { codigo: true } } },
    });
    if (jornadaOtra) {
      return apiError(
        `Tiene jornada abierta en obra ${jornadaOtra.obra.codigo}. Ciérrela primero.`,
        422,
      );
    }

    // Verificar no tiene jornada abierta en ESTA obra
    const jornadaActual = await prisma.checkin.findFirst({
      where: { instaladorId: usuario.id, obraId: input.obraId, horaSalida: null },
    });
    if (jornadaActual) {
      return apiError('Ya tiene una jornada abierta en esta obra', 422);
    }

    const checkin = await prisma.checkin.create({
      data: {
        obraId: input.obraId,
        instaladorId: usuario.id,
        horaEntrada: new Date(),
        nota: input.nota,
        latitud: input.latitud ?? null,
        longitud: input.longitud ?? null,
      },
    });

    await prisma.actividad.create({
      data: {
        obraId: input.obraId,
        usuarioId: usuario.id,
        accion: 'CHECKIN_REGISTRADO',
        entidad: 'checkin',
        entidadId: checkin.id,
        detalle: JSON.stringify({ nota: input.nota }),
      },
    });

    logger.info('checkin_registrado', {
      obraId: input.obraId, codigo: obra.codigo,
      instalador: usuario.email, estado: obra.estado,
    });

    return apiOk({ checkin }, 201);

  } catch (error) {
    logger.error('checkin_error', {
      error: error instanceof Error ? error.message : error,
    });
    return apiError('Error al registrar check-in', 500);
  }
}
