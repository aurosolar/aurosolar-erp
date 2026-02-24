// src/lib/auth.ts
// Autenticación: hashing, sesiones JWT, validación de permisos
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Rol } from '@prisma/client';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'dev-secret-cambiar');
const COOKIE_NAME = 'aurosolar_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días en segundos

// ── Hashing ──
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ──
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

// ── Sesión actual ──
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, nombre: true, apellidos: true, rol: true, activo: true, clienteId: true },
  });

  if (!usuario || !usuario.activo) return null;
  return usuario;
}

// ── Establecer cookie de sesión ──
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

// ── Cerrar sesión ──
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ── RBAC: Verificar permisos ──
type Permiso = {
  roles: Rol[];
};

const PERMISOS: Record<string, Permiso> = {
  'obras:ver':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'obras:crear':      { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL', 'JEFE_INSTALACIONES'] },
  'obras:editar':     { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'obras:cambiarEstado': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'obras:eliminar':   { roles: ['ADMIN'] },

  'cobros:ver':       { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'cobros:registrar': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },

  'incidencias:ver':  { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR', 'ADMINISTRACION'] },
  'incidencias:crear':{ roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'incidencias:resolver': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'usuarios:ver':       { roles: ['ADMIN'] },
  'usuarios:gestionar': { roles: ['ADMIN'] },
  'dashboard:ver':    { roles: ['ADMIN', 'DIRECCION'] },
  'legalizacion:ver': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'legalizacion:gestionar': { roles: ['ADMIN', 'DIRECCION', 'ADMINISTRACION'] },
  'portal:ver':       { roles: ['CLIENTE'] },
  'portal:soporte':   { roles: ['CLIENTE'] },

  'campo:checkin':    { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:gastos':     { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },
  'campo:validar':    { roles: ['INSTALADOR', 'JEFE_INSTALACIONES'] },

  'crm:ver':          { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:gestionar':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:crear':        { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },
  'crm:convertir':    { roles: ['ADMIN', 'DIRECCION', 'COMERCIAL'] },

  'planificacion:ver':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'planificacion:gestionar': { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'materiales:ver':          { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },
  'materiales:solicitar':    { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'INSTALADOR'] },
  'materiales:aprobar':      { roles: ['ADMIN', 'DIRECCION'] },

  'activos:ver':             { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES', 'ADMINISTRACION'] },
  'activos:gestionar':       { roles: ['ADMIN', 'DIRECCION', 'JEFE_INSTALACIONES'] },

  'config:ver':       { roles: ['ADMIN', 'DIRECCION'] },
};

export function tienePermiso(rol: Rol, permiso: string): boolean {
  const config = PERMISOS[permiso];
  if (!config) return false;
  return config.roles.includes(rol);
}
