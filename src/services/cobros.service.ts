// src/services/cobros.service.ts
// ═══════════════════════════════════════════
// SERVICIO DE COBROS — Lógica financiera
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { MetodoPago } from '@prisma/client';

// ── Tipos ──
export interface RegistrarPagoInput {
  obraId: string;
  importe: number; // Céntimos
  metodo: MetodoPago;
  fechaCobro?: Date;
  concepto?: string;
}

export interface AlertaCobro {
  tipo: 'efectivo_sin_ingresar' | 'cobro_30d' | 'cobro_15d' | 'terminada_sin_cobro' | 'financiacion_activa';
  icon: string;
  label: string;
  color: string;
  conteo: number;
  obraIds: string[];
}

// ── Listar obras con info de cobro (aging) ──
export async function listarCobros(filtro?: string) {
  const obras = await prisma.obra.findMany({
    where: {
      deletedAt: null,
      estado: { notIn: ['CANCELADA'] },
    },
    include: {
      cliente: { select: { nombre: true, apellidos: true, telefono: true } },
      pagos: { orderBy: { fechaCobro: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const resultado = obras.map((obra) => {
    const totalCobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
    const pendiente = obra.presupuestoTotal - totalCobrado;
    const porcentaje = obra.presupuestoTotal > 0 ? Math.round((totalCobrado / obra.presupuestoTotal) * 100) : 0;

    // Calcular aging: días desde último cobro o desde creación
    const ultimaFecha = obra.pagos.length > 0
      ? new Date(obra.pagos[0].fechaCobro)
      : new Date(obra.createdAt);
    const diasSinCobro = Math.floor((now.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

    // Efectivo pendiente de ingresar
    const efectivoPendiente = obra.pagos
      .filter(p => p.metodo === 'EFECTIVO' && !p.efectivoIngresado)
      .reduce((sum, p) => sum + p.importe, 0);

    return {
      id: obra.id,
      codigo: obra.codigo,
      estado: obra.estado,
      tipo: obra.tipo,
      cliente: obra.cliente,
      presupuestoTotal: obra.presupuestoTotal,
      totalCobrado,
      pendiente,
      porcentaje,
      diasSinCobro,
      efectivoPendiente,
      ultimoPago: obra.pagos[0] || null,
      numPagos: obra.pagos.length,
    };
  });

  // Filtrar según tipo de alerta
  if (filtro === 'pendientes') {
    return resultado.filter(o => o.pendiente > 0);
  }
  if (filtro === 'efectivo') {
    return resultado.filter(o => o.efectivoPendiente > 0);
  }
  if (filtro === '15d') {
    return resultado.filter(o => o.pendiente > 0 && o.diasSinCobro >= 15 && o.diasSinCobro < 30);
  }
  if (filtro === '30d') {
    return resultado.filter(o => o.pendiente > 0 && o.diasSinCobro >= 30);
  }
  if (filtro === 'terminadas') {
    return resultado.filter(o => o.pendiente > 0 && ['LEGALIZACION', 'LEGALIZADA', 'COMPLETADA'].includes(o.estado));
  }

  return resultado.filter(o => o.pendiente > 0).sort((a, b) => b.diasSinCobro - a.diasSinCobro);
}

// ── Registrar un pago ──
export async function registrarPago(input: RegistrarPagoInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (!obra) throw new Error('Obra no encontrada');

  // Calcular cobrado actual
  const totalActual = await prisma.pago.aggregate({
    where: { obraId: input.obraId },
    _sum: { importe: true },
  });
  const cobradoActual = totalActual._sum.importe || 0;
  const nuevoPendiente = obra.presupuestoTotal - cobradoActual - input.importe;

  if (input.importe <= 0) throw new Error('El importe debe ser positivo');
  if (nuevoPendiente < 0) throw new Error(`El cobro (${input.importe / 100}€) supera el pendiente (${(obra.presupuestoTotal - cobradoActual) / 100}€)`);

  // Crear pago
  const pago = await prisma.pago.create({
    data: {
      obraId: input.obraId,
      importe: input.importe,
      metodo: input.metodo,
      fechaCobro: input.fechaCobro || new Date(),
      concepto: input.concepto,
      registradoPorId: usuarioId,
      efectivoIngresado: input.metodo !== 'EFECTIVO', // Efectivo empieza sin ingresar
    },
  });

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'PAGO_REGISTRADO',
      entidad: 'pago',
      entidadId: pago.id,
      detalle: JSON.stringify({
        importe: input.importe,
        metodo: input.metodo,
        nuevoPendiente,
        cobradoTotal: cobradoActual + input.importe,
      }),
    },
  });

  logger.info('pago_registrado', {
    obraId: input.obraId,
    codigo: obra.codigo,
    importe: input.importe,
    metodo: input.metodo,
    nuevoPendiente,
    usuario: usuarioId,
  });

  return {
    pago,
    nuevoPendiente,
    porcentaje: Math.round(((cobradoActual + input.importe) / obra.presupuestoTotal) * 100),
    cobradoTotal: cobradoActual + input.importe,
  };
}

// ── Confirmar ingreso de efectivo ──
export async function confirmarEfectivo(pagoId: string, usuarioId: string) {
  const pago = await prisma.pago.update({
    where: { id: pagoId },
    data: { efectivoIngresado: true },
  });

  await prisma.actividad.create({
    data: {
      obraId: pago.obraId,
      usuarioId,
      accion: 'EFECTIVO_INGRESADO',
      entidad: 'pago',
      entidadId: pago.id,
      detalle: JSON.stringify({ importe: pago.importe }),
    },
  });

  return pago;
}

// ── Alertas financieras (watchdogs) ──
export async function obtenerAlertas(): Promise<AlertaCobro[]> {
  const cobros = await listarCobros();
  const todas = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    include: { pagos: true },
  });

  const alertas: AlertaCobro[] = [];

  // Efectivo sin ingresar
  const efectivoIds: string[] = [];
  for (const obra of todas) {
    const efectivoPendiente = obra.pagos.filter(p => p.metodo === 'EFECTIVO' && !p.efectivoIngresado);
    if (efectivoPendiente.length > 0) efectivoIds.push(obra.id);
  }
  if (efectivoIds.length > 0) {
    alertas.push({ tipo: 'efectivo_sin_ingresar', icon: '💵', label: 'Efectivo sin ingresar', color: 'red', conteo: efectivoIds.length, obraIds: efectivoIds });
  }

  // Cobros >30 días
  const mas30 = cobros.filter(c => c.pendiente > 0 && c.diasSinCobro >= 30);
  if (mas30.length > 0) {
    alertas.push({ tipo: 'cobro_30d', icon: '🔴', label: 'Cobros >30 días', color: 'red', conteo: mas30.length, obraIds: mas30.map(c => c.id) });
  }

  // Cobros >15 días
  const mas15 = cobros.filter(c => c.pendiente > 0 && c.diasSinCobro >= 15 && c.diasSinCobro < 30);
  if (mas15.length > 0) {
    alertas.push({ tipo: 'cobro_15d', icon: '🟡', label: 'Cobros >15 días', color: 'amber', conteo: mas15.length, obraIds: mas15.map(c => c.id) });
  }

  // Terminadas sin cobro total
  const terminadas = cobros.filter(c => c.pendiente > 0 && ['LEGALIZACION', 'LEGALIZADA', 'COMPLETADA'].includes(c.estado));
  if (terminadas.length > 0) {
    alertas.push({ tipo: 'terminada_sin_cobro', icon: '⚠️', label: 'Terminadas sin cobro total', color: 'amber', conteo: terminadas.length, obraIds: terminadas.map(c => c.id) });
  }

  return alertas;
}

// ── Resumen mensual ──
export async function resumenMensual(mes?: Date) {
  const ahora = mes || new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

  // Cobrado este mes
  const cobradoMes = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMes, lte: finMes } },
    _sum: { importe: true },
  });

  // Cobrado mes anterior
  const cobradoMesAnterior = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMesAnterior, lte: finMesAnterior } },
    _sum: { importe: true },
  });

  // Facturación (presupuestos de obras que pasaron a INSTALANDO este mes)
  const obrasInstalando = await prisma.actividad.findMany({
    where: {
      accion: 'ESTADO_CAMBIADO',
      createdAt: { gte: inicioMes, lte: finMes },
      detalle: { contains: 'INSTALANDO' },
    },
    select: { obraId: true },
    distinct: ['obraId'],
  });

  let facturacion = 0;
  for (const act of obrasInstalando) {
    if (act.obraId) {
      const obra = await prisma.obra.findUnique({ where: { id: act.obraId }, select: { presupuestoTotal: true } });
      if (obra) facturacion += obra.presupuestoTotal;
    }
  }

  // Pendiente total
  const todasObras = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    select: { id: true, presupuestoTotal: true },
  });
  let pendienteTotal = 0;
  for (const obra of todasObras) {
    const cobrado = await prisma.pago.aggregate({ where: { obraId: obra.id }, _sum: { importe: true } });
    pendienteTotal += obra.presupuestoTotal - (cobrado._sum.importe || 0);
  }

  const cobMes = cobradoMes._sum.importe || 0;
  const cobMesAnt = cobradoMesAnterior._sum.importe || 0;
  const delta = cobMesAnt > 0 ? Math.round(((cobMes - cobMesAnt) / cobMesAnt) * 100) : 0;

  return {
    facturacion,
    cobradoMes: cobMes,
    pendienteTotal,
    porcentaje: facturacion > 0 ? Math.round((cobMes / facturacion) * 100) : 0,
    delta,
  };
}
