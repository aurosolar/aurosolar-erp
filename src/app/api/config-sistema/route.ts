// src/app/api/config-sistema/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const GET = withAuth('config:ver', async () => {
  const config = await crmV2.obtenerConfigSistema();
  return apiOk(config);
});

const updateSchema = z.object({
  nombreEmpresa: z.string().optional(),
  logoUrl: z.string().optional(),
  colorPrimario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorSecundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const PATCH = withAuth('config:editar', async (req, { usuario }) => {
  const data = await parseBody(req, updateSchema);
  const config = await crmV2.actualizarConfigSistema(data, usuario.id);
  return apiOk(config);
});
