// src/services/dashboard.service.ts
import { prisma } from '@/lib/prisma';

// ── KPIs principales ──
export async function obtenerKPIs() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

  const obrasActivas = await prisma.obra.count({
    where: { deletedAt: null, estado: { notIn: ['COMPLETADA', 'CANCELADA', 'LEGALIZADA'] } },
  });

  const instalandoHoy = await prisma.obra.count({ where: { estado: 'INSTALANDO' } });

  const cobradoMes = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMes, lte: finMes } }, _sum: { importe: true },
  });
  const cobradoMesAnt = await prisma.pago.aggregate({
    where: { fechaCobro: { gte: inicioMesAnt, lte: finMesAnt } }, _sum: { importe: true },
  });

  const facturacion = await prisma.obra.aggregate({
    where: { createdAt: { gte: inicioMes, lte: finMes }, deletedAt: null, estado: { not: 'CANCELADA' } },
    _sum: { presupuestoTotal: true },
  });
  const facturacionAnt = await prisma.obra.aggregate({
    where: { createdAt: { gte: inicioMesAnt, lte: finMesAnt }, deletedAt: null, estado: { not: 'CANCELADA' } },
    _sum: { presupuestoTotal: true },
  });

  // Pendiente total optimizado
  const obrasPdte = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    select: { id: true, presupuestoTotal: true, pagos: { select: { importe: true, fechaCobro: true }, orderBy: { fechaCobro: 'desc' } } },
  });
  let pendienteTotal = 0, obrasPendientes15d = 0;
  for (const obra of obrasPdte) {
    const cobrado = obra.pagos.reduce((s, p) => s + p.importe, 0);
    const pdte = obra.presupuestoTotal - cobrado;
    if (pdte > 0) {
      pendienteTotal += pdte;
      const ref = obra.pagos[0]?.fechaCobro || new Date();
      if (Math.floor((ahora.getTime() - new Date(ref).getTime()) / 86400000) >= 15) obrasPendientes15d++;
    }
  }

  const costesTotal = await prisma.obra.aggregate({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA'] } },
    _sum: { costeTotal: true, presupuestoTotal: true },
  });
  const sumP = costesTotal._sum.presupuestoTotal || 0;
  const sumC = costesTotal._sum.costeTotal || 0;
  const margen = sumP > 0 ? Math.round(((sumP - sumC) / sumP) * 100) : 0;

  const cobMes = cobradoMes._sum.importe || 0;
  const cobMesAnt2 = cobradoMesAnt._sum.importe || 0;
  const facMes = facturacion._sum.presupuestoTotal || 0;
  const facMesAnt2 = facturacionAnt._sum.presupuestoTotal || 0;

  return {
    facturacion: { valor: facMes, delta: facMesAnt2 > 0 ? Math.round(((facMes - facMesAnt2) / facMesAnt2) * 100) : 0 },
    cobradoMes: { valor: cobMes, delta: cobMesAnt2 > 0 ? Math.round(((cobMes - cobMesAnt2) / cobMesAnt2) * 100) : 0 },
    pendiente: { valor: pendienteTotal, obrasMas15d: obrasPendientes15d },
    obrasActivas, instalandoHoy, margen,
  };
}

// ── Alertas watchdog ampliadas ──
export async function obtenerAlertasDashboard() {
  const alertas: Array<{ tipo: string; icon: string; label: string; color: string; conteo: number; href: string }> = [];
  const ahora = new Date();

  // Efectivo sin ingresar
  const efectivo = await prisma.pago.count({ where: { metodo: 'EFECTIVO', efectivoIngresado: false } });
  if (efectivo > 0) alertas.push({ tipo: 'efectivo', icon: '⚡', label: 'Efectivo sin ingresar', color: 'red', conteo: efectivo, href: '/cobros' });

  // Incidencias alta/critica abiertas
  const incKO = await prisma.incidencia.count({ where: { estado: 'ABIERTA', gravedad: { in: ['ALTA', 'CRITICA'] } } });
  if (incKO > 0) alertas.push({ tipo: 'incidencias_ko', icon: '🔴', label: 'Incidencia KO', color: 'red', conteo: incKO, href: '/incidencias' });

  // Cobros >15d
  const obrasCon = await prisma.obra.findMany({
    where: { deletedAt: null, estado: { notIn: ['CANCELADA', 'COMPLETADA'] } },
    select: { presupuestoTotal: true, pagos: { select: { importe: true, fechaCobro: true }, orderBy: { fechaCobro: 'desc' } }, createdAt: true },
  });
  let cobros15d = 0;
  for (const o of obrasCon) {
    const cobrado = o.pagos.reduce((s, p) => s + p.importe, 0);
    if (o.presupuestoTotal - cobrado > 0) {
      const ref = o.pagos[0]?.fechaCobro || o.createdAt;
      if (Math.floor((ahora.getTime() - new Date(ref).getTime()) / 86400000) >= 15) cobros15d++;
    }
  }
  if (cobros15d > 0) alertas.push({ tipo: 'cobros_15d', icon: '⏳', label: 'Cobros >15 días', color: 'amber', conteo: cobros15d, href: '/cobros' });

  // Legalizaciones estancadas (>30 días)
  const legEstancadas = await prisma.obra.count({
    where: { estado: 'LEGALIZACION', updatedAt: { lte: new Date(ahora.getTime() - 30 * 86400000) } },
  });
  if (legEstancadas > 0) alertas.push({ tipo: 'legalizacion', icon: '📋', label: 'Legalización estancada', color: 'amber', conteo: legEstancadas, href: '/legalizacion' });

  // Programada sin material aprobado
  const progSinMat = await prisma.obra.count({
    where: {
      estado: 'PROGRAMADA',
      deletedAt: null,
      solicitudesMaterial: { none: { estado: 'APROBADA' } },
    },
  });
  if (progSinMat > 0) alertas.push({ tipo: 'sin_material', icon: '📦', label: 'Programada sin material', color: 'amber', conteo: progSinMat, href: '/materiales' });

  // Subvenciones próximas a caducar (<30 días)
  try {
    const subCaducar = await prisma.subvencion.count({
      where: {
        estado: { in: ['SOLICITADA', 'EN_TRAMITE', 'APROBADA'] },
        fechaLimite: { lte: new Date(ahora.getTime() + 30 * 86400000), gte: ahora },
      },
    });
    if (subCaducar > 0) alertas.push({ tipo: 'subvenciones', icon: '🏛️', label: 'Subvención vence pronto', color: 'amber', conteo: subCaducar, href: '/subvenciones' });
  } catch { /* subvenciones table may not exist yet */ }

  // Garantías vencidas
  try {
    const garantiasVencidas = await prisma.activoInstalado.count({
      where: { garantiaHasta: { lte: ahora } },
    });
    if (garantiasVencidas > 0) alertas.push({ tipo: 'garantias', icon: '🔋', label: 'Garantía vencida', color: 'red', conteo: garantiasVencidas, href: '/activos' });
  } catch { /* */ }

  // Mantenimientos pendientes
  try {
    const mantPendiente = await prisma.mantenimiento.count({ where: { estado: 'PROGRAMADO' } });
    if (mantPendiente > 0) alertas.push({ tipo: 'mantenimiento', icon: '🔧', label: 'Mantenimiento pendiente', color: 'blue', conteo: mantPendiente, href: '/activos' });
  } catch { /* */ }

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
    const [presupuestado, cobrado] = await Promise.all([
      prisma.obra.aggregate({ where: { createdAt: { gte: inicio, lte: fin }, deletedAt: null, estado: { not: 'CANCELADA' } }, _sum: { presupuestoTotal: true } }),
      prisma.pago.aggregate({ where: { fechaCobro: { gte: inicio, lte: fin } }, _sum: { importe: true } }),
    ]);
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
    include: { obra: { select: { codigo: true } }, creadoPor: { select: { nombre: true } } },
    orderBy: [{ gravedad: 'desc' }, { createdAt: 'asc' }],
    take: 10,
  });
}

// ── Contadores por estado de obra ──
export async function contadoresPorEstado() {
  const grupos = await prisma.obra.groupBy({
    by: ['estado'], where: { deletedAt: null }, _count: { id: true },
  });
  return grupos.reduce((acc, g) => ({ ...acc, [g.estado]: g._count.id }), {} as Record<string, number>);
}

// ── Actividad reciente ──
export async function actividadReciente() {
  return prisma.actividad.findMany({
    include: {
      usuario: { select: { nombre: true } },
      obra: { select: { codigo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
}

// ── Ranking comerciales ──
export async function rankingComerciales() {
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const comerciales = await prisma.usuario.findMany({
    where: { rol: 'COMERCIAL', activo: true },
    select: {
      id: true, nombre: true, apellidos: true,
      obrasComercial: {
        where: { deletedAt: null, createdAt: { gte: inicioMes } },
        select: { presupuestoTotal: true },
      },
    },
  });
  return comerciales.map(c => ({
    nombre: `${c.nombre} ${c.apellidos || ''}`.trim(),
    obras: c.obrasComercial.length,
    volumen: c.obrasComercial.reduce((s, o) => s + o.presupuestoTotal, 0),
  })).sort((a, b) => b.volumen - a.volumen);
}
