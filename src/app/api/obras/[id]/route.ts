// src/app/api/obras/[id]/route.ts
// GET: Detalle obra — PATCH: Cambiar estado
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
  return apiOk(obra);
});

// ── PATCH /api/obras/[id] ──
const cambiarEstadoSchema = z.object({
  estado: z.enum([
    'REVISION_TECNICA', 'PREPARANDO', 'PENDIENTE_MATERIAL', 'PROGRAMADA',
    'INSTALANDO', 'TERMINADA', 'INCIDENCIA', 'LEGALIZACION',
    'LEGALIZADA', 'COMPLETADA', 'CANCELADA',
  ]),
  nota: z.string().optional(),
});

export const PATCH = withAuth('obras:cambiarEstado', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const { estado, nota } = await parseBody(req, cambiarEstadoSchema);

  try {
    const obra = await obrasService.cambiarEstadoObra(id, estado, usuario.id, nota);
    return apiOk(obra);
  } catch (error) {
    if (error instanceof Error) {
      return apiError(error.message, 422);
    }
    throw error;
  }
});
