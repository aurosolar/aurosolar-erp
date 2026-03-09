// POST /api/jornada/sesion/cerrar-pausada
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const { obraId, motivo } = await req.json();
    if (!obraId || !motivo) return apiError('obraId y motivo requeridos', 400);

    // Crear work_report especial
    await prisma.workReport.create({
      data: {
        obraId,
        empleadoId: usuario.id,
        tipo: 'PARTE_ESPECIAL',
        estado: 'FIRMADO',
        datos: { motivo, tipo: 'obra_pausada_sin_cierre' },
      },
    });

    await prisma.actividad.create({
      data: {
        obraId,
        usuarioId: usuario.id,
        accion: 'PARTE_ESPECIAL',
        entidad: 'work_report',
        entidadId: obraId,
        detalle: JSON.stringify({ motivo }),
      },
    });

    logger.info('parte_especial_creado', { obraId, empleadoId: usuario.id, motivo });
    return apiOk({ ok: true }, 201);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
