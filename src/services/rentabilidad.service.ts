// src/services/rentabilidad.service.ts
import { prisma } from '@/lib/prisma';

export async function rentabilidadObras(filtros?: { desde?: Date; hasta?: Date }) {
  const where: any = { deletedAt: null };
  if (filtros?.desde || filtros?.hasta) {
    where.createdAt = {};
    if (filtros.desde) where.createdAt.gte = filtros.desde;
    if (filtros.hasta) where.createdAt.lte = filtros.hasta;
  }

  const obras = await prisma.obra.findMany({
    where,
    include: {
      cliente: { select: { nombre: true, apellidos: true } },
      pagos: { select: { importe: true, verificado: true } },
      solicitudesMaterial: {
        where: { estado: { notIn: ['RECHAZADA', 'BORRADOR'] } },
        include: { lineas: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return obras.map(obra => {
    const presupuesto = obra.presupuestoTotal || 0;
    const cobrado = obra.pagos.filter(p => p.verificado).reduce((s, p) => s + p.importe, 0);
    const pendiente = presupuesto - cobrado;
    const costeMaterial = obra.solicitudesMaterial.reduce((s, sol) =>
      s + sol.lineas.reduce((ls, l) => ls + l.cantidad * l.costeUnitario, 0), 0);

    const margenBruto = presupuesto - costeMaterial;
    const margenPct = presupuesto > 0 ? Math.round((margenBruto / presupuesto) * 100) : 0;

    return {
      id: obra.id,
      codigo: obra.codigo,
      cliente: `${obra.cliente.nombre} ${obra.cliente.apellidos}`,
      tipo: obra.tipo,
      estado: obra.estado,
      localidad: obra.localidad,
      potencia: obra.potenciaKwp,
      presupuesto,
      cobrado,
      pendiente,
      costeMaterial,
      margenBruto,
      margenPct,
    };
  });
}

export async function resumenRentabilidad(filtros?: { desde?: Date; hasta?: Date }) {
  const obras = await rentabilidadObras(filtros);

  const totalPresupuesto = obras.reduce((s, o) => s + o.presupuesto, 0);
  const totalCobrado = obras.reduce((s, o) => s + o.cobrado, 0);
  const totalPendiente = obras.reduce((s, o) => s + o.pendiente, 0);
  const totalMaterial = obras.reduce((s, o) => s + o.costeMaterial, 0);
  const totalMargen = obras.reduce((s, o) => s + o.margenBruto, 0);
  const margenPctGlobal = totalPresupuesto > 0 ? Math.round((totalMargen / totalPresupuesto) * 100) : 0;

  // Obras con peor margen
  const peorMargen = [...obras]
    .filter(o => o.presupuesto > 0)
    .sort((a, b) => a.margenPct - b.margenPct)
    .slice(0, 5);

  // Obras con mayor pendiente
  const mayorPendiente = [...obras]
    .filter(o => o.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)
    .slice(0, 5);

  return {
    totalObras: obras.length,
    totalPresupuesto,
    totalCobrado,
    totalPendiente,
    totalMaterial,
    totalMargen,
    margenPctGlobal,
    peorMargen,
    mayorPendiente,
    obras,
  };
}
