// src/lib/api.ts — SPRINT 1 FINAL
//
// Cambios respecto al original:
//   + Protección CSRF en métodos mutadores (POST/PUT/PATCH/DELETE)
//     Estrategia Opción A (sin tokens extra, sin librerías):
//       - Exigir Content-Type: application/json
//       - Exigir X-Requested-With: aurosolar-erp
//       - (opcional) Verificar Origin si ALLOWED_ORIGIN está en .env
//
// Por qué es necesario:
//   Las cookies httpOnly son inmunes a XSS (el JS malicioso no puede leerlas),
//   pero el navegador las envía automáticamente en CUALQUIER request al dominio.
//   Eso permite CSRF: una web maliciosa puede hacer un POST a /api/obras
//   y el navegador incluirá la cookie del usuario autenticado.
//   SameSite=strict (en auth.ts) ya mitiga mucho, pero este header es la
//   segunda capa: un <form> externo o fetch() cross-origin no puede poner
//   headers custom, así que el check lo rechaza antes de llegar a la lógica.
//
// Lo que debe hacer el frontend:
//   Todos los fetch() de POST/PUT/PATCH/DELETE deben incluir:
//     headers: {
//       'Content-Type': 'application/json',
//       'X-Requested-With': 'aurosolar-erp',
//     }
//
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSession, tienePermiso } from './auth';
import type { Rol } from '@prisma/client';

// Header custom para CSRF. Debe coincidir con lo que envía el frontend.
const CSRF_HEADER      = 'x-requested-with';
const CSRF_HEADER_VALUE = 'aurosolar-erp';

// Métodos que mutan estado → requieren protección CSRF
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type HandlerContext = {
  usuario: {
    id: string;
    email: string;
    nombre: string;
    apellidos: string;
    rol: Rol;
    activo: boolean;
    clienteId: string | null;
    empresaId: string | null;
  };
  params?: Record<string, string>;
};

type RouteHandler = (
  req: NextRequest,
  ctx: HandlerContext
) => Promise<NextResponse> | NextResponse;

// ── Helpers de respuesta ──────────────────────────────────────────────────────

export function apiOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// ── withAuth: autenticación + RBAC + CSRF ─────────────────────────────────────

export function withAuth(
  permiso: string | null,
  handler: RouteHandler
) {
  return async (req: NextRequest, nextCtx?: { params?: Record<string, string> }) => {

    // ── CSRF: proteger métodos mutadores ─────────────────────────────────────
    if (MUTATING_METHODS.has(req.method)) {
      // 1. Content-Type debe ser application/json
      //    Rechaza form submits externos (application/x-www-form-urlencoded).
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return apiError('Content-Type debe ser application/json', 415);
      }

      // 2. Header custom: un <form> o fetch() cross-origin no puede enviarlo
      const csrfHeader = req.headers.get(CSRF_HEADER);
      if (csrfHeader !== CSRF_HEADER_VALUE) {
        return apiError('Solicitud no autorizada', 403);
      }

      // 3. Origin check (opcional, si ALLOWED_ORIGIN está definido)
      //    Si no está en .env, se omite (no rompe en dev/staging sin dominio fijo).
      const allowedOrigin = process.env.ALLOWED_ORIGIN;
      if (allowedOrigin) {
        const origin = req.headers.get('origin');
        if (origin && origin !== allowedOrigin) {
          return apiError('Origen no permitido', 403);
        }
      }
    }

    // ── Autenticación ─────────────────────────────────────────────────────────
    const usuario = await getSession();
    if (!usuario) {
      return apiError('No autenticado', 401);
    }

    // ── Autorización (RBAC) ───────────────────────────────────────────────────
    if (permiso && !tienePermiso(usuario.rol, permiso)) {
      return apiError('Sin permisos suficientes', 403);
    }

    // ── Llamar al handler ─────────────────────────────────────────────────────
    return handler(req, { usuario, params: nextCtx?.params });
  };
}

// ── withAuthOptional: para rutas que funcionan con o sin sesión ───────────────

export function withAuthOptional(handler: RouteHandler) {
  return async (req: NextRequest, nextCtx?: { params?: Record<string, string> }) => {
    const usuario = await getSession();
    // Si no hay sesión, pasamos un usuario vacío — el handler decide qué hacer
    return handler(req, {
      usuario: usuario ?? {
        id: '',
        email: '',
        nombre: '',
        apellidos: '',
        rol: 'CLIENTE' as Rol,
        activo: false,
        clienteId: null,
        empresaId: null,
      },
      params: nextCtx?.params,
    });
  };
}

// ── Funciones heredadas del api.ts original ───────────────────────────────────

import { ZodSchema, ZodError } from 'zod';

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

// ── Generar código de obra: A-YYYY-MM-XXX ─────────────────────────────────────

export async function generarCodigoObra(): Promise<string> {
  const { prisma } = await import('./prisma');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `A-${year}-${month}-`;
  const ultima = await prisma.obra.findFirst({
    where: { codigo: { startsWith: prefix } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true },
  });
  let siguiente = 1;
  if (ultima) {
    const num = parseInt(ultima.codigo.split('-').pop() || '0', 10);
    siguiente = num + 1;
  }
  return `${prefix}${String(siguiente).padStart(3, '0')}`;
}

// ── Formatear importes ────────────────────────────────────────────────────────

export function centimosAEuros(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

export function eurosACentimos(euros: number): number {
  return Math.round(euros * 100);
}
