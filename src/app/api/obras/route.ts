// src/app/api/obras/route.ts
// GET: Listar obras — POST: Crear obra
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as obrasService from '@/services/obras.service';

export const dynamic = 'force-dynamic';

// ── GET /api/obras ──
export const GET = withAuth('obras:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);

  const filtros: obrasService.FiltrosObra = {
    estado: searchParams.get('estado') as any || undefined,
    tipo: searchParams.get('tipo') as any || undefined,
    comercialId: searchParams.get('comercialId') || undefined,
    instaladorId: searchParams.get('instaladorId') || undefined,
    busqueda: searchParams.get('q') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
  };

  const resultado = await obrasService.listarObras(filtros, usuario.rol, usuario.id);
  return apiOk(resultado);
});

// ── POST /api/obras ──
const crearObraSchema = z.object({
  clienteId: z.string().uuid(),
  tipo: z.enum(['RESIDENCIAL', 'INDUSTRIAL', 'AGROINDUSTRIAL', 'BATERIA', 'AEROTERMIA', 'BESS', 'BACKUP']),
  direccionInstalacion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  potenciaKwp: z.number().positive().optional(),
  numPaneles: z.number().int().positive().optional(),
  inversor: z.string().optional(),
  bateriaKwh: z.number().positive().optional(),
  presupuestoTotal: z.number().int().min(0), // Céntimos
  comercialId: z.string().uuid().optional(),
  notas: z.string().optional(),
});

export const POST = withAuth('obras:crear', async (req, { usuario }) => {
  const input = await parseBody(req, crearObraSchema);
  const obra = await obrasService.crearObra(input, usuario.id);
  return apiOk(obra, 201);
});
