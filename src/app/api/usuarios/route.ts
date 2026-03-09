// src/app/api/usuarios/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as usuariosService from '@/services/usuarios.service';

export const dynamic = 'force-dynamic';

const crearSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  apellidos: z.string().optional(),
  password: z.string().min(6),
  rol: z.enum(['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION']),
  telefono: z.string().optional(),
  zona: z.string().optional(),
  objetivoMensual: z.number().int().optional(),
});

export const GET = withAuth('usuarios:ver', async (_req, ctx) => {
  const usuarios = await usuariosService.listarUsuarios(ctx.usuario.empresaId || "");
  return apiOk(usuarios);
});

export const POST = withAuth('usuarios:gestionar', async (req, ctx) => {
  try {
    const input = await crearSchema.parseAsync(await req.json());
    const usuario = await usuariosService.crearUsuario({ ...input, empresaId: ctx.usuario.empresaId || "" });
    return apiOk(usuario, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
