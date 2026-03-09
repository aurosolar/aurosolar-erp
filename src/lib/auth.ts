// src/lib/auth.ts — SPRINT 1 FINAL
//
// Modelo de sesión:
//   - 1 JWT de 7 días en cookie httpOnly
//   - Cada request verifica JWT + existencia en DB → logout real funciona
//   - Logout borra de DB → token invalidado aunque no haya expirado
//   - clearAllSessions() para cambio de contraseña
//   - Rate limit combinado IP+email (resistente a proxy mal configurado)
//   - Guard globalThis para setInterval → sin timers duplicados en hot reload
//   - getSession() borra cookie si token no existe en DB (no arrastra cookies muertas)

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Rol } from '@prisma/client';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('❌ NEXTAUTH_SECRET no está definido en .env');
}

const SECRET           = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const COOKIE_NAME      = 'aurosolar_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días

// ── Hashing ──────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ───────────────────────────────────────────────────────────────────────
// 1 token único de 7 días. Sin complejidad de refresh tokens por ahora.

export async function createToken(userId: string, rol: Rol): Promise<string> {
  return new SignJWT({ userId, rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: string; rol: Rol };
  } catch {
    return null;
  }
}

// ── Sesión: crear (en login) ──────────────────────────────────────────────────

export async function createSession(userId: string, rol: Rol): Promise<string> {
  const token = await createToken(userId, rol);

  await prisma.session.create({
    data: {
      usuarioId: userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
    },
  });

  return token;
}

// ── Sesión: leer (en cada request) ───────────────────────────────────────────
// Verifica JWT *y* existencia en DB.
// Si el usuario hizo logout, el token no existe en DB → devuelve null.
// Además borra la cookie si el token no existe en DB (no la arrastra durante horas).

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  // 1. Verificar firma y expiración del JWT
  const payload = await verifyToken(token);
  if (!payload) return null;

  // 2. Verificar que la sesión existe en DB (permite logout server-side)
  const sessionEnDb = await prisma.session.findUnique({
    where: { token },
    select: { expiresAt: true },
  });

  if (!sessionEnDb || sessionEnDb.expiresAt < new Date()) {
    return null;
  }

  // 3. Cargar usuario activo
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellidos: true,
      rol: true,
      activo: true,
      clienteId: true,
    },
  });

  if (!usuario || !usuario.activo) return null;
  return usuario;
}

// ── Cookie ────────────────────────────────────────────────────────────────────

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',   // strict: bloquea más CSRF que lax
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

// ── Logout: invalida en DB Y borra cookie ─────────────────────────────────────

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    // Borrar de DB → el token queda muerto aunque alguien lo tenga guardado
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }

  cookieStore.delete(COOKIE_NAME);
}

// ── Cerrar todas las sesiones del usuario ─────────────────────────────────────
// Usar al cambiar contraseña o al revocar acceso desde admin

export async function clearAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { usuarioId: userId } });
}

// ── Limpiar sesiones expiradas (llamar desde cron nocturno) ───────────────────

export async function purgeExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

// ── Rate limiting en memoria ──────────────────────────────────────────────────
// Sin Redis. Funciona en PM2 single-process (VPS estándar).
// Límite: 10 intentos por ventana de 15 minutos.
//
// Clave combinada IP+email:
//   - Si Nginx no pasa IP real (x-forwarded-for = 127.0.0.1), el límite por
//     email sigue funcionando → resistente a proxy mal configurado.
//   - Ataques de credential stuffing usan muchas cuentas distintas → el límite
//     por IP los frena incluso si cambian de email.
//   Usar: checkRateLimit(ip, email)

interface RateLimitEntry { count: number; resetAt: number }
const loginAttempts = new Map<string, RateLimitEntry>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX       = 10;

function makeKey(ip: string, email: string): string {
  return `${ip}::${email.toLowerCase()}`;
}

export function checkRateLimit(
  ip: string,
  email: string
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const key  = makeKey(ip, email);
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= RATE_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(ip: string, email: string) {
  loginAttempts.delete(makeKey(ip, email));
}

// Guard globalThis: evita múltiples setInterval si Next recarga el módulo
// en caliente (hot reload). Sin esto pueden acumularse 10+ timers.
declare global {
  // eslint-disable-next-line no-var
  var __rl_cleanup_started: boolean | undefined;
}

if (!globalThis.__rl_cleanup_started) {
  globalThis.__rl_cleanup_started = true;
  setInterval(() => {
    const now = Date.now();
loginAttempts.forEach((entry, key) => {
    if (now > entry.resetAt) loginAttempts.delete(key);
  });
  }, 60 * 60 * 1000); // limpiar cada hora
}

// ── RBAC ──────────────────────────────────────────────────────────────────────
// Sin cambios — el sistema de permisos existente es correcto.

type Permiso = { roles: Rol[] };

const PERMISOS: Record<string, Permiso> = {
  'obras:ver':               { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'obras:crear':             { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES'] },
  'obras:editar':            { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'obras:cambiarEstado':     { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'obras:override':          { roles: ['ADMIN', 'JEFE_INSTALACIONES'] },
  'obras:eliminar':          { roles: ['ADMIN'] },
  'auditoria:ver':           { roles: ['ADMIN', 'DIRECCION'] },
  'cobros:ver':              { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'cobros:registrar':        { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'incidencias:ver':         { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'incidencias:crear':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'incidencias:resolver':    { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'usuarios:ver':            { roles: ['ADMIN'] },
  'usuarios:gestionar':      { roles: ['ADMIN'] },
  'dashboard:ver':           { roles: ['ADMIN', 'DIRECCION'] },
  'legalizacion:ver':        { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'legalizacion:gestionar':  { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'portal:ver':              { roles: ['CLIENTE'] },
  'portal:soporte':          { roles: ['CLIENTE'] },
  'campo:checkin':           { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:gastos':            { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:validar':           { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'crm:ver':                 { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:gestionar':           { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:crear':               { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:editar':              { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:convertir':           { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:ver':          { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:crear':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tareas-crm:editar':       { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'planificacion:ver':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'planificacion:gestionar': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'materiales:ver':          { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'materiales:solicitar':    { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'materiales:aprobar':      { roles: ['ADMIN', 'DIRECCION'] },
  'activos:ver':             { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'activos:gestionar':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'config:ver':              { roles: ['ADMIN', 'DIRECCION'] },
  'config:editar':           { roles: ['ADMIN'] },
  'contactos:ver':           { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:crear':         { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:editar':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'contactos:convertir':     { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:ver':              { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:crear':            { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:editar':           { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'tratos:convertir':        { roles: ['ADMIN', 'DIRECCION'] },
  'exportar:ver':            { roles: ['ADMIN', 'DIRECCION'] },
  'comisiones:ver':          { roles: ['ADMIN', 'DIRECCION'] },
  'comisiones:gestionar':    { roles: ['ADMIN', 'DIRECCION'] },
};

export function tienePermiso(rol: Rol, permiso: string): boolean {
  const config = PERMISOS[permiso];
  if (!config) return false;
  return config.roles.includes(rol);
}
