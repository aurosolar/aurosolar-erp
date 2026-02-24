// src/lib/api.ts
// Helpers para API Routes: respuestas estándar, manejo de errores, validación
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { getSession } from './auth';
import { tienePermiso } from './auth';
import logger from './logger';
import type { Rol } from '@prisma/client';

// ── Respuesta estándar ──
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// ── Validar body con Zod ──
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

// ── Wrapper para API routes con auth + permisos + error handling ──
type ApiHandler = (
  req: NextRequest,
  context: { usuario: { id: string; email: string; nombre: string; apellidos: string; rol: Rol; clienteId?: string | null } }
) => Promise<NextResponse>;

export function withAuth(permiso: string, handler: ApiHandler) {
  return async (req: NextRequest) => {
    try {
      const usuario = await getSession();

      if (!usuario) {
        return apiError('No autenticado', 401);
      }

      if (!tienePermiso(usuario.rol, permiso)) {
        logger.warn('acceso_denegado', {
          usuario: usuario.email,
          permiso,
          ruta: req.nextUrl.pathname,
        });
        return apiError('Sin permisos', 403);
      }

      return await handler(req, { usuario });
    } catch (error) {
      if (error instanceof ZodError) {
        return apiError(`Validación: ${error.errors.map((e) => e.message).join(', ')}`, 422);
      }

      logger.error('error_api', {
        ruta: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : error,
      });

      return apiError('Error interno del servidor', 500);
    }
  };
}

// ── Generar código de obra: A-YYYY-MM-XXX ──
export async function generarCodigoObra(): Promise<string> {
  const { prisma } = await import('./prisma');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `A-${year}-${month}-`;

  // Buscar el último código del mes
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

// ── Formatear importes (céntimos → euros) ──
export function centimosAEuros(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

export function eurosACentimos(euros: number): number {
  return Math.round(euros * 100);
}
