// src/app/api/usuarios/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as usuariosService from '@/services/usuarios.service';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellidos: z.string().optional(),
  rol: z.enum(['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION']).optional(),
  activo: z.boolean().optional(),
  telefono: z.string().optional(),
  zona: z.string().optional(),
  objetivoMensual: z.number().int().optional(),
  password: z.string().min(6).optional(),
});

export const PATCH = withAuth('usuarios:gestionar', async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  try {
    const input = await updateSchema.parseAsync(await req.json());
    const usuario = await usuariosService.actualizarUsuario(id, input);
    return apiOk(usuario);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error', 422);
  }
});
