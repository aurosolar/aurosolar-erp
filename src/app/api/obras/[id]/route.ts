// src/app/api/obras/[id]/route.ts
// GET: Detalle obra — PATCH: Cambiar estado — PUT: Editar obra
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, apiError, parseBody } from '@/lib/api';
import * as obrasService from '@/services/obras.service';

export const dynamic = 'force-dynamic';

// ── GET /api/obras/[id] ──
export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const obra = await obrasService.detalleObra(id);
  if (!obra) return apiError('Obra no encontrada', 404);

  // Añadir transiciones disponibles según rol del usuario
  const transiciones = obrasService.getTransicionesDisponibles(obra.estado, usuario.rol as any);

  return apiOk({ ...obra, transicionesDisponibles: transiciones });
});

// ── PATCH /api/obras/[id] — Cambiar estado ──
const cambiarEstadoSchema = z.object({
  estado: z.enum([
    'REVISION_TECNICA', 'PREPARANDO', 'PENDIENTE_MATERIAL', 'PROGRAMADA',
    'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR',
    'TERMINADA', 'LEGALIZACION', 'LEGALIZADA', 'COMPLETADA', 'CANCELADA',
  ]),
  nota: z.string().optional(),
  override: z.boolean().optional(),
});

export const PATCH = withAuth('obras:cambiarEstado', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { estado, nota, override } = await parseBody(req, cambiarEstadoSchema);

  try {
    const obra = await obrasService.cambiarEstadoObra(
      id, estado as any, usuario.id, usuario.rol as any, nota, override
    );
    return apiOk(obra);
  } catch (error) {
    if (error instanceof Error) {
      return apiError(error.message, 422);
    }
    throw error;
  }
});

// ── PUT /api/obras/[id] — Editar datos de obra ──
const editarObraSchema = z.object({
  direccionInstalacion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  potenciaKwp: z.number().optional(),
  numPaneles: z.number().int().optional(),
  inversor: z.string().optional(),
  bateriaKwh: z.number().optional(),
  presupuestoTotal: z.number().int().optional(),
  notas: z.string().optional(),
  fechaProgramada: z.string().optional(),
  comercialId: z.string().uuid().optional(),
});

export const PUT = withAuth('obras:editar', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const input = await parseBody(req, editarObraSchema);

  const { prisma } = await import('@/lib/prisma');
  const obra = await prisma.obra.findUnique({ where: { id } });
  if (!obra) return apiError('Obra no encontrada', 404);

  const obraActualizada = await prisma.obra.update({
    where: { id },
    data: {
      ...input,
      fechaProgramada: input.fechaProgramada ? new Date(input.fechaProgramada) : undefined,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: id,
      usuarioId: usuario.id,
      accion: 'OBRA_EDITADA',
      entidad: 'obra',
      entidadId: id,
      detalle: JSON.stringify({ campos: Object.keys(input) }),
    },
  });

  return apiOk(obraActualizada);
});
