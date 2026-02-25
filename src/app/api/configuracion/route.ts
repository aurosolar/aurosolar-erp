// src/app/api/configuracion/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as configService from '@/services/configuracion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('config:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo') || undefined;
  const catalogos = await configService.listarCatalogos(tipo);
  return apiOk(catalogos);
});

const crearSchema = z.object({
  tipo: z.string().min(2),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  orden: z.number().int().optional(),
  metadata: z.string().optional(),
});

export const POST = withAuth('config:ver', async (req) => {
  try {
    const input = await crearSchema.parseAsync(await req.json());
    const catalogo = await configService.crearCatalogo(input);
    return apiOk(catalogo, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
