// POST /api/campo/checkin — Check-in instalador (atómico)
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { evaluateCheckinTransition } from '@/services/gate-engine';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ESTADOS_CHECKIN_PERMITIDOS = ['PROGRAMADA', 'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR'] as const;

// GET — listar checkins del instalador
export const GET = withAuth('campo:checkin', async (req, { usuario }) => {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const checkins = await prisma.checkin.findMany({
    where: { instaladorId: usuario.id },
    orderBy: { horaEntrada: 'desc' },
    take: limit,
    include: { obra: { select: { codigo: true, direccionInstalacion: true, estado: true, cliente: { select: { nombre: true, apellidos: true } } } } },
  });
  return apiOk(checkins);
});

// POST — crear checkin + transición atómica si PROGRAMADA
export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  const body = await req.json();
  const { obraId, nota, latitud, longitud } = body;
  if (!obraId) return apiError('obraId requerido', 400);

  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true, estado: true, codigo: true } });
  if (!obra) return apiError('Obra no encontrada', 404);

  if (!ESTADOS_CHECKIN_PERMITIDOS.includes(obra.estado as any)) {
    return apiError(`No se puede hacer check-in en estado ${obra.estado}`, 400);
  }

  // Si PROGRAMADA → transición atómica a INSTALANDO
  if (obra.estado === 'PROGRAMADA') {
    const nombreCompleto = `${usuario.nombre} ${usuario.apellidos || ""}`.trim();
    const evaluation = await evaluateCheckinTransition(obraId, usuario.id, nombreCompleto);
    if (!evaluation.allowed) {
      return apiError(JSON.stringify(evaluation), 422);
    }

    // Transacción atómica: checkin + cambio estado + actividades
    const result = await prisma.$transaction(async (tx) => {
      const checkin = await tx.checkin.create({
        data: { obraId, instaladorId: usuario.id, horaEntrada: new Date(), nota, latitud: latitud ?? null, longitud: longitud ?? null },
      });
      await tx.obra.update({ where: { id: obraId }, data: { estado: 'INSTALANDO', fechaInicio: new Date() } });
      await tx.actividad.createMany({
        data: [
          { obraId, usuarioId: usuario.id, accion: 'CHECKIN_REGISTRADO', entidad: 'checkin', entidadId: checkin.id, detalle: JSON.stringify({ nota }) },
          { obraId, usuarioId: usuario.id, accion: 'ESTADO_CAMBIADO', entidad: 'obra', entidadId: obraId, detalle: JSON.stringify({ estadoAnterior: 'PROGRAMADA', nuevoEstado: 'INSTALANDO', motivo: 'Check-in automático' }) },
        ],
      });
      return checkin;
    });

    logger.info('checkin_con_transicion', { obraId, codigo: obra.codigo, usuario: usuario.id });
    return apiOk(result, 201);
  }

  // Si ya INSTALANDO u otro → solo checkin
  const checkin = await prisma.checkin.create({
    data: { obraId, instaladorId: usuario.id, horaEntrada: new Date(), nota, latitud: latitud ?? null, longitud: longitud ?? null },
  });
  await prisma.actividad.create({
    data: { obraId, usuarioId: usuario.id, accion: 'CHECKIN_REGISTRADO', entidad: 'checkin', entidadId: checkin.id, detalle: JSON.stringify({ nota }) },
  });

  logger.info('checkin_registrado', { obraId, codigo: obra.codigo, usuario: usuario.id });
  return apiOk(checkin, 201);
});
