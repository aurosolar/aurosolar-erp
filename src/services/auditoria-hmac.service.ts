// src/services/auditoria-hmac.service.ts
// ═══════════════════════════════════════════════════════════
// AUDITORÍA HMAC — Cadena de integridad por obra
// Cada evento firma el anterior. Si se altera uno, la cadena se rompe.
// ═══════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';
import logger from '@/lib/logger';

// Secret para HMAC (usar NEXTAUTH_SECRET como base)
const HMAC_SECRET = process.env.NEXTAUTH_SECRET || 'aurosolar-hmac-secret-change-me';

// ── Generar hash HMAC de un evento ──
function computeHash(data: {
  seq: number;
  obraId: string;
  accion: string;
  detalle: string | null;
  usuarioId: string;
  prevHash: string | null;
}): string {
  const canonical = JSON.stringify({
    seq: data.seq,
    obraId: data.obraId,
    accion: data.accion,
    detalle: data.detalle,
    usuarioId: data.usuarioId,
    prevHash: data.prevHash,
  });
  return createHmac('sha256', HMAC_SECRET).update(canonical).digest('hex');
}

// ── Registrar evento auditado con cadena HMAC ──
export async function registrarEvento(params: {
  obraId: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle?: Record<string, any>;
}): Promise<void> {
  const { obraId, usuarioId, accion, entidad, entidadId, detalle } = params;
  const detalleStr = detalle ? JSON.stringify(detalle) : null;

  // Obtener último evento de esta obra para continuar la cadena
  const ultimo = await prisma.actividad.findFirst({
    where: { obraId, seq: { not: null } },
    orderBy: { seq: 'desc' },
    select: { seq: true, hash: true },
  });

  const seq = (ultimo?.seq ?? 0) + 1;
  const prevHash = ultimo?.hash ?? null;

  const hash = computeHash({
    seq,
    obraId,
    accion,
    detalle: detalleStr,
    usuarioId,
    prevHash,
  });

  await prisma.actividad.create({
    data: {
      obraId,
      usuarioId,
      accion,
      entidad,
      entidadId: entidadId || obraId,
      detalle: detalleStr,
      seq,
      prevHash,
      hash,
    },
  });

  logger.info('audit_event', { obraId, accion, seq, hash: hash.substring(0, 12) });
}

// ── Verificar integridad de la cadena de una obra ──
export async function verificarCadena(obraId: string): Promise<{
  ok: boolean;
  totalEventos: number;
  eventosVerificados: number;
  primerError?: { seq: number; esperado: string; encontrado: string | null };
}> {
  const eventos = await prisma.actividad.findMany({
    where: { obraId, seq: { not: null } },
    orderBy: { seq: 'asc' },
    select: {
      id: true,
      seq: true,
      obraId: true,
      accion: true,
      detalle: true,
      usuarioId: true,
      prevHash: true,
      hash: true,
    },
  });

  if (eventos.length === 0) {
    return { ok: true, totalEventos: 0, eventosVerificados: 0 };
  }

  let prevHash: string | null = null;

  for (let i = 0; i < eventos.length; i++) {
    const ev = eventos[i];
    const expectedHash = computeHash({
      seq: ev.seq!,
      obraId: ev.obraId!,
      accion: ev.accion,
      detalle: ev.detalle,
      usuarioId: ev.usuarioId,
      prevHash: ev.prevHash,
    });

    // Verificar que el hash almacenado es correcto
    if (ev.hash !== expectedHash) {
      return {
        ok: false,
        totalEventos: eventos.length,
        eventosVerificados: i,
        primerError: { seq: ev.seq!, esperado: expectedHash, encontrado: ev.hash },
      };
    }

    // Verificar que prevHash apunta al hash del evento anterior
    if (ev.prevHash !== prevHash) {
      return {
        ok: false,
        totalEventos: eventos.length,
        eventosVerificados: i,
        primerError: { seq: ev.seq!, esperado: prevHash || '(null)', encontrado: ev.prevHash },
      };
    }

    prevHash = ev.hash;
  }

  return { ok: true, totalEventos: eventos.length, eventosVerificados: eventos.length };
}
