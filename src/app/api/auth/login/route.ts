// src/app/api/auth/login/route.ts — SPRINT 1 FINAL
// Flujo:
//   1. Leer IP (antes de parsear body — necesitamos IP aunque el body sea inválido)
//   2. Parsear y validar body con Zod (necesitamos email para rate limit combinado)
//   3. Rate limit por IP+email
//   4. Buscar usuario
//   5. Verificar contraseña (siempre ejecutar bcrypt — evita timing attacks)
//   6. Crear sesión + cookie
//
// Sobre el orden de rate limit vs parse:
//   Parseamos body ANTES del rate limit check porque necesitamos el email
//   para la clave combinada. Si el body es inválido devolvemos 400 directamente
//   (no contabilizamos como intento fallido de login).

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  checkRateLimit,
  resetRateLimit,
} from '@/lib/auth';
import { apiOk, apiError } from '@/lib/api';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// Dummy hash para bcrypt timing attack prevention.
// bcrypt.compare con un hash inválido tarda ~igual que con uno válido.
// Sin esto, un atacante puede detectar si el email existe midiendo el tiempo
// de respuesta (si el email no existe, no hay hash → responde mucho más rápido).
const DUMMY_HASH = '$2b$12$invalidhashtopreventtimingattack00000000000';

export async function POST(req: NextRequest) {
  // ── 1. Leer IP ───────────────────────────────────────────────────────────────
  // x-forwarded-for puede ser una lista "client, proxy1, proxy2" → tomar el primero.
  // Si Nginx tiene real_ip_header configurado, x-real-ip es más fiable.
  // En cualquier caso, la clave combinada IP+email hace el rate limit robusto
  // incluso si la IP es 127.0.0.1 (proxy sin configurar).
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0';

  // ── 2. Validar body ──────────────────────────────────────────────────────────
  let input: z.infer<typeof loginSchema>;
  try {
    const body = await req.json();
    input = loginSchema.parse(body);
  } catch {
    return apiError('Datos inválidos', 400);
  }

  // ── 3. Rate limit por IP+email ────────────────────────────────────────────────
  // Combinado: si IP es proxy (127.0.0.1), el límite por email sigue activo.
  // Si el atacante cambia de email (credential stuffing), el límite por IP lo frena.
  const { allowed, retryAfterMs } = checkRateLimit(ip, input.email);

  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    logger.warn('login_rate_limit', { ip, email: input.email });
    return apiError(`Demasiados intentos. Espera ${retryAfterSec} segundos.`, 429);
  }

  // ── 4. Buscar usuario ─────────────────────────────────────────────────────────
  const usuario = await prisma.usuario.findUnique({
    where: { email: input.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellidos: true,
      rol: true,
      activo: true,
      passwordHash: true,
    },
  });

  // ── 5. Verificar contraseña ───────────────────────────────────────────────────
  // IMPORTANTE: ejecutar bcrypt SIEMPRE, incluso si el usuario no existe.
  // Sin esto: si email no existe → respuesta en ~0ms; si existe → ~300ms.
  // Esa diferencia de tiempo revela qué emails están registrados.
  const hashToCompare = usuario?.passwordHash ?? DUMMY_HASH;
  const passwordOk = await verifyPassword(input.password, hashToCompare);

  if (!usuario || !passwordOk || !usuario.activo) {
    logger.warn('login_fallido', { email: input.email, ip });
    // Mensaje genérico: no revelar si el email existe o no
    return apiError('Email o contraseña incorrectos', 401);
  }

  // ── 6. Login correcto ─────────────────────────────────────────────────────────
  // Resetear rate limit SOLO en login correcto.
  // Si lo hiciéramos en cada intento fallido, un atacante podría resetear
  // el contador enviando un intento "incompleto" (body inválido) entre cada prueba.
  resetRateLimit(ip, input.email);

  const token = await createSession(usuario.id, usuario.rol);
  await setSessionCookie(token);

  logger.info('login_ok', { usuarioId: usuario.id, rol: usuario.rol, ip });

  return apiOk({
    usuario: {
      id:        usuario.id,
      email:     usuario.email,
      nombre:    usuario.nombre,
      apellidos: usuario.apellidos,
      rol:       usuario.rol,
    },
  });
}
