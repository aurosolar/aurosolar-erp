// src/services/export.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Exportar obras a CSV ──
export async function exportarObrasCSV() {
  const obras = await prisma.obra.findMany({
    where: { deletedAt: null },
    include: {
      cliente: { select: { nombre: true, apellidos: true, dniCif: true } },
      comercial: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'Código;Cliente;DNI/CIF;Estado;Tipo;Localidad;Provincia;Potencia kWp;Paneles;Inversor;Presupuesto;Coste;Comercial;Creada';
  const rows = obras.map(o => [
    o.codigo,
    `${o.cliente.nombre} ${o.cliente.apellidos || ''}`.trim(),
    o.cliente.dniCif || '',
    o.estado,
    o.tipo,
    o.localidad || '',
    o.provincia || '',
    o.potenciaKwp || '',
    o.numPaneles || '',
    o.inversor || '',
    (o.presupuestoTotal / 100).toFixed(2),
    (o.costeTotal / 100).toFixed(2),
    o.comercial?.nombre || '',
    ''
    new Date(o.createdAt).toLocaleDateString('es-ES'),
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── Exportar clientes a CSV ──
export async function exportarClientesCSV() {
  const clientes = await prisma.cliente.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { obras: true } } },
    orderBy: { nombre: 'asc' },
  });

  const header = 'Nombre;Apellidos;DNI/CIF;Teléfono;Email;Dirección;CP;Localidad;Provincia;Nº Obras;Creado';
  const rows = clientes.map(c => [
    c.nombre, c.apellidos || '', c.dniCif || '', c.telefono || '',
    c.email || '', c.direccion || '', c.codigoPostal || '',
    c.localidad || '', c.provincia || '', c._count.obras,
    new Date(c.createdAt).toLocaleDateString('es-ES'),
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── Exportar cobros a CSV ──
export async function exportarCobrosCSV() {
  const pagos = await prisma.pago.findMany({
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true } } } },
      registradoPor: { select: { nombre: true } },
    },
    orderBy: { fechaCobro: 'desc' },
  });

  const header = 'Obra;Cliente;Importe;Método;Fecha;Concepto;Registrado por';
  const rows = pagos.map(p => [
    p.obra.codigo,
    p.obra.cliente.nombre,
    (p.importe / 100).toFixed(2),
    p.metodo,
    new Date(p.fechaCobro).toLocaleDateString('es-ES'),
    p.concepto || '',
    p.registradoPor.nombre,
  ].join(';'));

  return [header, ...rows].join('\n');
}

// ── GDPR: Exportar datos de un cliente ──
export async function exportarDatosCliente(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      obras: {
        include: {
          pagos: true,
          incidencias: true,
          documentos: { where: { deletedAt: null } },
        },
      },
      leads: true,
    },
  });
  if (!cliente) throw new Error('Cliente no encontrado');
  return cliente;
}

// ── GDPR: Anonimizar cliente ──
export async function anonimizarCliente(clienteId: string, usuarioId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new Error('Cliente no encontrado');

  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      nombre: 'ANONIMIZADO',
      apellidos: '',
      dniCif: null,
      telefono: null,
      email: null,
      direccion: null,
      codigoPostal: null,
      localidad: null,
      provincia: null,
      notas: null,
      deletedAt: new Date(),
    },
  });

  await prisma.actividad.create({
    data: {
      usuarioId,
      accion: 'GDPR_ANONIMIZADO',
      entidad: 'cliente',
      entidadId: clienteId,
      detalle: JSON.stringify({ nombre_original: cliente.nombre }),
    },
  });

  logger.info('gdpr_anonimizado', { clienteId });
  return { ok: true };
}
