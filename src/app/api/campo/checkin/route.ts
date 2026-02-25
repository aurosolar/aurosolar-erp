// src/app/api/campo/checkin/route.ts
import { z } from 'zod';
import { withAuth, apiOk } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ── GET /api/campo/checkin — Listar checkins del instalador ──
export const GET = withAuth('campo:checkin', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const checkins = await prisma.checkin.findMany({
    where: { instaladorId: usuario.id },
    orderBy: { horaEntrada: 'desc' },
    take: limit,
    include: {
      obra: {
        select: {
          codigo: true,
          direccionInstalacion: true,
          localidad: true,
          estado: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });

  return apiOk(checkins);
});

// ── POST /api/campo/checkin — Registrar check-in ──
const checkinSchema = z.object({
  obraId: z.string().uuid(),
  nota: z.string().optional(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
});

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  const input = await checkinSchema.parseAsync(await req.json());

  // Verificar que no haya checkin activo (sin checkout)
  const checkinActivo = await prisma.checkin.findFirst({
    where: { instaladorId: usuario.id, horaSalida: null },
  });

  if (checkinActivo) {
    return Response.json(
      { ok: false, error: 'Ya tienes un check-in activo. Haz check-out primero.' },
      { status: 400 }
    );
  }

  // Verificar que el instalador está asignado a esta obra
  const asignacion = await prisma.obraInstalador.findUnique({
    where: { obraId_instaladorId: { obraId: input.obraId, instaladorId: usuario.id } },
  });

  if (!asignacion) {
    return Response.json(
      { ok: false, error: 'No estás asignado a esta obra.' },
      { status: 403 }
    );
  }

  // Crear checkin
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

  // Si la obra estaba en PROGRAMADA, cambiar a INSTALANDO
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (obra && obra.estado === 'PROGRAMADA') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: { estado: 'INSTALANDO', fechaInicio: obra.fechaInicio || new Date() },
    });

    await prisma.actividad.create({
      data: {
        obraId: input.obraId,
        usuarioId: usuario.id,
        accion: 'ESTADO_CAMBIADO',
        entidad: 'obra',
        entidadId: input.obraId,
        detalle: JSON.stringify({
          estadoAnterior: 'PROGRAMADA',
          nuevoEstado: 'INSTALANDO',
          motivo: 'Check-in automático',
        }),
      },
    });
  }

  // Registrar actividad del checkin
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'CHECKIN_REGISTRADO',
      entidad: 'checkin',
      entidadId: checkin.id,
      detalle: JSON.stringify({
        nota: input.nota,
        latitud: input.latitud,
        longitud: input.longitud,
        conGeo: !!(input.latitud && input.longitud),
      }),
    },
  });

  logger.info('checkin_registrado', { obraId: input.obraId, instalador: usuario.email });
  return apiOk(checkin, 201);
});

// ── PATCH /api/campo/checkin — Check-out (registrar salida) ──
const checkoutSchema = z.object({
  checkinId: z.string().uuid(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  nota: z.string().optional(),
});

export const PATCH = withAuth('campo:checkin', async (req, { usuario }) => {
  const input = await checkoutSchema.parseAsync(await req.json());

  // Buscar el checkin y verificar que pertenece al usuario
  const checkin = await prisma.checkin.findFirst({
    where: { id: input.checkinId, instaladorId: usuario.id, horaSalida: null },
  });

  if (!checkin) {
    return Response.json(
      { ok: false, error: 'Check-in no encontrado o ya cerrado.' },
      { status: 404 }
    );
  }

  const ahora = new Date();
  const duracionMs = ahora.getTime() - checkin.horaEntrada.getTime();
  const duracionMin = Math.round(duracionMs / 60000);

  // Actualizar checkin con hora de salida
  const checkinActualizado = await prisma.checkin.update({
    where: { id: input.checkinId },
    data: { horaSalida: ahora },
  });

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: checkin.obraId,
      usuarioId: usuario.id,
      accion: 'CHECKOUT_REGISTRADO',
      entidad: 'checkin',
      entidadId: checkin.id,
      detalle: JSON.stringify({
        duracionMinutos: duracionMin,
        horaEntrada: checkin.horaEntrada.toISOString(),
        horaSalida: ahora.toISOString(),
        nota: input.nota,
      }),
    },
  });

  logger.info('checkout_registrado', {
    obraId: checkin.obraId,
    instalador: usuario.email,
    duracionMin,
  });

  return apiOk({ ...checkinActualizado, duracionMinutos: duracionMin });
});
