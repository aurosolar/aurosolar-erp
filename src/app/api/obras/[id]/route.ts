// PATCH /api/obras/[id] — Cambio de estado + edición de campos
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { executeTransition, getTransicionesDisponibles } from '@/services/gate-engine';
import * as obrasService from '@/services/obras.service';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CAMPOS_EDITABLES = [
  'clienteId', 'presupuestoTotal', 'costeTotal', 'fechaProgramada',
  'direccionInstalacion', 'expedienteLegal', 'estadoLegalizacion',
  'potenciaKwp', 'numPaneles', 'inversor', 'bateriaKwh', 'notas', 'latitud', 'longitud',
  'localidad', 'provincia', 'marcaPaneles',
] as const;

// GET /api/obras/[id]
export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const obra = await obrasService.detalleObra(id);
  if (!obra) return apiError('Obra no encontrada', 404);
  const transiciones = getTransicionesDisponibles(obra.estado as any, usuario.rol as any);
  return apiOk({ ...obra, transicionesDisponibles: transiciones });
});

// PATCH /api/obras/[id]
export const PATCH = withAuth('obras:cambiarEstado', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const body = await req.json();
  const { estado, nota, override, desprogramar, ...campos } = body;

  // CASO 0: Desprogramar — quitar fecha, jornadas, instaladores
  if (desprogramar === true) {
    const obraCheck = await prisma.obra.findUnique({ where: { id }, select: { estado: true } });
    if (!obraCheck || !['PROGRAMADA'].includes(obraCheck.estado)) {
      return apiError('Solo se puede desprogramar una obra en estado PROGRAMADA', 422);
    }
    await prisma.obraJornada.deleteMany({ where: { obraId: id } });
    await prisma.obraInstalador.deleteMany({ where: { obraId: id } });
    await prisma.obra.update({ where: { id }, data: { estado: 'PREPARANDO', fechaProgramada: null } });
    await prisma.actividad.create({
      data: { obraId: id, usuarioId: usuario.id, accion: 'OBRA_DESPROGRAMADA', entidad: 'obra', entidadId: id, detalle: JSON.stringify({ estadoAnterior: obraCheck.estado }) },
    });
    logger.info('obra_desprogramada', { obraId: id, usuario: usuario.id });
    return apiOk({ desprogramada: true });
  }

  // CASO 1: Cambio de estado → executeTransition
  if (estado) {
    const result = await executeTransition(id, estado, usuario.id, usuario.rol as any, nota, override === true);
    if (!result.ok) {
      return apiError(JSON.stringify(result.result), result.result.reasons.some((r: string) => r.includes('permisos')) ? 403 : 422);
    }
    return apiOk(result);
  }

  // CASO 2: Solo editar campos
  const camposValidos: any = {};
  for (const key of CAMPOS_EDITABLES) {
    if (campos[key] !== undefined) camposValidos[key] = campos[key];
  }

  if (Object.keys(camposValidos).length === 0) {
    return apiError('No se proporcionaron campos válidos ni estado', 400);
  }

  if (camposValidos.fechaProgramada) {
    camposValidos.fechaProgramada = new Date(camposValidos.fechaProgramada);
  }

  const obra = await prisma.obra.update({ where: { id }, data: camposValidos });
  await prisma.actividad.create({
    data: { obraId: id, usuarioId: usuario.id, accion: 'OBRA_EDITADA', entidad: 'obra', entidadId: id, detalle: JSON.stringify({ campos: Object.keys(camposValidos) }) },
  });

  logger.info('obra_editada', { obraId: id, campos: Object.keys(camposValidos), usuario: usuario.id });
  return apiOk(obra);
});
