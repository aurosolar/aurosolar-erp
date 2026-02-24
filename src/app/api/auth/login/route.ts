// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';
import { apiOk, apiError } from '@/lib/api';
import logger from '@/lib/logger';

const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!usuario || !usuario.activo) {
      logger.warn('login_fallido', { email, razon: 'usuario_no_encontrado' });
      return apiError('Credenciales incorrectas', 401);
    }

    const passwordValida = await verifyPassword(password, usuario.passwordHash);
    if (!passwordValida) {
      logger.warn('login_fallido', { email, razon: 'password_incorrecta' });
      return apiError('Credenciales incorrectas', 401);
    }

    const token = await createToken(usuario.id, usuario.rol);
    await setSessionCookie(token);

    logger.info('login_exitoso', { email, rol: usuario.rol });

    return apiOk({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 422);
    }
    logger.error('login_error', error);
    return apiError('Error interno', 500);
  }
}
