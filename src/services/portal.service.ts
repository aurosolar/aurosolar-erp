// src/services/portal.service.ts
// ═══════════════════════════════════════════
// SERVICIO PORTAL CLIENTE — Aislado por clienteId
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';

// ── Mis obras (solo las del cliente) ──
export async function misObras(clienteId: string) {
  return prisma.obra.findMany({
    where: { clienteId, deletedAt: null },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      estado: true,
      estadoLegalizacion: true,
      direccionInstalacion: true,
      potenciaKwp: true,
      presupuestoTotal: true,
      createdAt: true,
      pagos: {
        select: { importe: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Detalle de una obra (verificando que pertenece al cliente) ──
export async function detalleObra(obraId: string, clienteId: string) {
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, clienteId, deletedAt: null },
    include: {
      pagos: {
        select: { id: true, importe: true, metodo: true, fechaCobro: true, concepto: true },
        orderBy: { fechaCobro: 'desc' },
      },
      incidencias: {
        select: { id: true, gravedad: true, estado: true, descripcion: true, createdAt: true, fechaResolucion: true },
        orderBy: { createdAt: 'desc' },
      },
      documentos: {
        select: { id: true, tipo: true, nombre: true, url: true, createdAt: true },
        where: { visible: true }, // Solo docs marcados como visibles para cliente
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!obra) return null;

  const cobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);

  return {
    ...obra,
    cobrado,
    pendiente: obra.presupuestoTotal - cobrado,
    porcentajeCobro: obra.presupuestoTotal > 0 ? Math.round((cobrado / obra.presupuestoTotal) * 100) : 0,
  };
}

// ── Crear ticket de soporte ──
export async function crearTicketSoporte(input: {
  obraId: string;
  descripcion: string;
}, clienteId: string) {
  // Verificar que la obra pertenece al cliente
  const obra = await prisma.obra.findFirst({ where: { id: input.obraId, clienteId } });
  if (!obra) throw new Error('Obra no encontrada');

  const incidencia = await prisma.incidencia.create({
    data: {
      obraId: input.obraId,
      gravedad: 'MEDIA',
      estado: 'ABIERTA',
      descripcion: input.descripcion,
      origenPortal: true,
    },
  });

  return incidencia;
}

// ── Datos del perfil del cliente ──
export async function miPerfil(clienteId: string) {
  return prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      email: true,
      telefono: true,
      direccion: true,
      localidad: true,
      provincia: true,
    },
  });
}

// ── Resumen global del cliente ──
export async function resumenCliente(clienteId: string) {
  const obras = await prisma.obra.findMany({
    where: { clienteId, deletedAt: null },
    select: {
      id: true,
      estado: true,
      presupuestoTotal: true,
      pagos: { select: { importe: true } },
      incidencias: { where: { estado: { in: ['ABIERTA', 'EN_PROCESO'] } }, select: { id: true } },
    },
  });

  const totalObras = obras.length;
  const obrasActivas = obras.filter(o => !['COMPLETADA', 'CANCELADA'].includes(o.estado)).length;
  const incidenciasAbiertas = obras.reduce((sum, o) => sum + o.incidencias.length, 0);
  const totalPresupuestado = obras.reduce((sum, o) => sum + o.presupuestoTotal, 0);
  const totalCobrado = obras.reduce((sum, o) => sum + o.pagos.reduce((s, p) => s + p.importe, 0), 0);

  return {
    totalObras,
    obrasActivas,
    incidenciasAbiertas,
    totalPresupuestado,
    totalCobrado,
    pendiente: totalPresupuestado - totalCobrado,
  };
}
