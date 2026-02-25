// src/app/api/cobros/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as cobrosService from '@/services/cobros.service';

export const dynamic = 'force-dynamic';

// GET /api/cobros — Listar obras con cobros pendientes
export const GET = withAuth('cobros:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const filtro = searchParams.get('filtro') || undefined;
  const cobros = await cobrosService.listarCobros(filtro);
  return apiOk(cobros);
});

// POST /api/cobros — Registrar un pago
const pagoSchema = z.object({
  obraId: z.string().uuid(),
  importe: z.number().int().positive('Importe debe ser positivo'), // Céntimos
  metodo: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'FINANCIACION', 'TARJETA', 'DOMICILIACION']),
  fechaCobro: z.string().datetime().optional(),
  concepto: z.string().optional(),
});

export const POST = withAuth('cobros:registrar', async (req, { usuario }) => {
  const input = await parseBody(req, pagoSchema);
  try {
    const resultado = await cobrosService.registrarPago(
      {
        ...input,
        fechaCobro: input.fechaCobro ? new Date(input.fechaCobro) : undefined,
      },
      usuario.id
    );
    return apiOk(resultado, 201);
  } catch (error) {
    if (error instanceof Error) {
      return (await import('@/lib/api')).apiError(error.message, 422);
    }
    throw error;
  }
});
