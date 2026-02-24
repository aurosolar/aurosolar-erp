// src/services/dashboard.service.ts
// ═══════════════════════════════════════════
// SERVICIO DASHBOARD — KPIs, alertas, gráficos
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';

// ── KPIs principales ──
export async function obtenerKPIs() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

  // Obras activas
  const obrasActivas = await prisma.obra.count({
    where: { deletedAt: null, estado: { notIn: ['COMPLETADA', 'CANCELADA', 'LEGALIZADA'] } },
  });

  // Instalaciones hoy
  const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hoyFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  const instalandoHoy = await prisma.obra.count({
    where: { estado: 'INSTALANDO' },
  });

  // Cobrado este mes
  const cobradoMes = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMes, lte: finMes } },
    _sum: { importe: true },
  });
  const cobradoMesAnt = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMesAnt, lte: finMesAnt } },
    _sum: { importe: true },
  });

  // Facturación: presupuestos de obras creadas este mes
  const facturacion = await prisma.obra.aggregate({
    where: { createdAt: { gte: inicioMes, lte: finMes }, deletedAt: null, estado: { not: 'CANCELADA' } },
    _sum: { presupuestoTotal: true },
  });
  const facturacionAnt = await prisma.obra.aggregate({
    where: { createdAt: { gte: inicioMesAnt, lte: finMesAnt }, deletedAt: null, estado: { not: 'CANCELADA' } },
    _sum: { presupuestoTotal: true },
  });

  // Pendiente total
  const todasObras = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    select: { id: true, presupuestoTotal: true },
  });
  let pendienteTotal = 0;
  let obrasPendientes15d = 0;
  for (const obra of todasObras) {
    const cobrado = await prisma.pago.aggregate({ where: { obraId: obra.id }, _sum: { importe: true } });
    const pdte = obra.presupuestoTotal - (cobrado._sum.importe || 0);
    if (pdte > 0) {
      pendienteTotal += pdte;
      const ultimoPago = await prisma.pago.findFirst({ where: { obraId: obra.id }, orderBy: { fechaCobro: 'desc' } });
      const ref = ultimoPago ? new Date(ultimoPago.fechaCobro) : new Date();
      const dias = Math.floor((ahora.getTime() - ref.getTime()) / 86400000);
      if (dias >= 15) obrasPendientes15d++;
    }
  }

  // Margen bruto
  const costesTotal = await prisma.obra.aggregate({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    _sum: { costeTotal: true, presupuestoTotal: true },
  });
  const sumPresupuesto = costesTotal._sum.presupuestoTotal || 0;
  const sumCoste = costesTotal._sum.costeTotal || 0;
  const margen = sumPresupuesto > 0 ? Math.round(((sumPresupuesto - sumCoste) / sumPresupuesto) * 100) : 0;

  const cobMes = cobradoMes._sum.importe || 0;
  const cobMesAnt2 = cobradoMesAnt._sum.importe || 0;
  const facMes = facturacion._sum.presupuestoTotal || 0;
  const facMesAnt2 = facturacionAnt._sum.presupuestoTotal || 0;

  return {
    facturacion: { valor: facMes, delta: facMesAnt2 > 0 ? Math.round(((facMes - facMesAnt2) / facMesAnt2) * 100) : 0 },
    cobradoMes: { valor: cobMes, delta: cobMesAnt2 > 0 ? Math.round(((cobMes - cobMesAnt2) / cobMesAnt2) * 100) : 0 },
    pendiente: { valor: pendienteTotal, obrasMas15d: obrasPendientes15d },
    obrasActivas,
    instalandoHoy,
    margen,
  };
}

// ── Alertas watchdog ──
export async function obtenerAlertasDashboard() {
  const alertas: Array<{ tipo: string; icon: string; label: string; color: string; conteo: number }> = [];
  const ahora = new Date();

  // Efectivo sin ingresar
  const efectivo = await prisma.pago.count({ where: { metodo: 'EFECTIVO', efectivoIngresado: false } });
  if (efectivo > 0) alertas.push({ tipo: 'efectivo', icon: '⚡', label: 'Efectivo sin ingresar', color: 'red', conteo: efectivo });

  // Incidencias alta/critica abiertas
  const incKO = await prisma.incidencia.count({ where: { estado: 'ABIERTA', gravedad: { in: ['ALTA', 'CRITICA'] } } });
  if (incKO > 0) alertas.push({ tipo: 'incidencias_ko', icon: '🔴', label: 'Incidencia KO sin resolver', color: 'red', conteo: incKO });

  // Cobros >15d (calculado simplificado)
  const obrasConPendiente = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA', 'COMPLETADA'] } },
    include: { pagos: { orderBy: { fechaCobro: 'desc' }, take: 1 } },
  });
  let cobros15d = 0;
  for (const obra of obrasConPendiente) {
    const cobrado = await prisma.pago.aggregate({ where: { obraId: obra.id }, _sum: { importe: true } });
    const pdte = obra.presupuestoTotal - (cobrado._sum.importe || 0);
    if (pdte > 0) {
      const ref = obra.pagos[0] ? new Date(obra.pagos[0].fechaCobro) : new Date(obra.createdAt);
      if (Math.floor((ahora.getTime() - ref.getTime()) / 86400000) >= 15) cobros15d++;
    }
  }
  if (cobros15d > 0) alertas.push({ tipo: 'cobros_15d', icon: '⏳', label: 'Cobros >15 días', color: 'amber', conteo: cobros15d });

  // Legalizaciones estancadas (>30 días en mismo estado)
  const legEstancadas = await prisma.obra.count({
    where: {
      estado: 'LEGALIZACION',
      updatedAt: { lte: new Date(ahora.getTime() - 30 * 86400000) },
    },
  });
  if (legEstancadas > 0) alertas.push({ tipo: 'legalizacion', icon: '📋', label: 'Legalizaciones estancadas', color: 'amber', conteo: legEstancadas });

  return alertas;
}

// ── Gráfico facturación anual ──
export async function graficoFacturacion(year?: number) {
  const anio = year || new Date().getFullYear();
  const meses = [];

  for (let m = 0; m < 12; m++) {
    const inicio = new Date(anio, m, 1);
    const fin = new Date(anio, m + 1, 0, 23, 59, 59);
    const esFuturo = inicio > new Date();

    const presupuestado = await prisma.obra.aggregate({
      where: { createdAt: { gte: inicio, lte: fin }, deletedAt: null, estado: { not: 'CANCELADA' } },
      _sum: { presupuestoTotal: true },
    });

    const cobrado = await prisma.pago.aggregate({
      where: { fechaCobro: { gte: inicio, lte: fin } },
      _sum: { importe: true },
    });

    meses.push({
      mes: inicio.toLocaleDateString('es-ES', { month: 'short' }),
      presupuestado: presupuestado._sum.presupuestoTotal || 0,
      cobrado: cobrado._sum.importe || 0,
      esFuturo,
    });
  }

  return meses;
}

// ── Incidencias abiertas ──
export async function incidenciasAbiertas() {
  return prisma.incidencia.findMany({
    where: { estado: { in: ['ABIERTA', 'EN_PROCESO'] } },
    include: {
      obra: { select: { codigo: true } },
      creadoPor: { select: { nombre: true } },
    },
    orderBy: [{ gravedad: 'desc' }, { createdAt: 'asc' }],
    take: 10,
  });
}

// ── Contadores por estado de obra ──
export async function contadoresPorEstado() {
  const grupos = await prisma.obra.groupBy({
    by: ['estado'],
    where: { deletedAt: null },
    _count: { id: true },
  });
  return grupos.reduce((acc, g) => ({ ...acc, [g.estado]: g._count.id }), {} as Record<string, number>);
}
