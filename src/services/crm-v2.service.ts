// src/services/crm-v2.service.ts
import { prisma } from '@/lib/prisma';
import { EstadoContacto, EstadoTrato } from '@prisma/client';

// ═══ CONTACTOS ═══

export async function listarContactos(filtros: { estado?: string; comercialId?: string; q?: string }) {
  const where: any = { deletedAt: null };
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.comercialId) where.comercialId = filtros.comercialId;
  if (filtros.q) {
    where.OR = [
      { nombre: { contains: filtros.q, mode: 'insensitive' } },
      { apellidos: { contains: filtros.q, mode: 'insensitive' } },
      { empresa: { contains: filtros.q, mode: 'insensitive' } },
      { telefono: { contains: filtros.q, mode: 'insensitive' } },
      { email: { contains: filtros.q, mode: 'insensitive' } },
    ];
  }
  return prisma.contacto.findMany({
    where,
    include: {
      comercial: { select: { id: true, nombre: true, apellidos: true } },
      tratos: { select: { id: true, estado: true, importe: true, titulo: true } },
      _count: { select: { tareasCrm: true, notasCrm: true, archivosCrm: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function obtenerContacto(id: string) {
  return prisma.contacto.findUnique({
    where: { id },
    include: {
      comercial: { select: { id: true, nombre: true, apellidos: true, email: true } },
      cliente: { select: { id: true, nombre: true, apellidos: true } },
      tratos: { orderBy: { createdAt: 'desc' }, include: { obra: { select: { id: true, codigo: true, estado: true } } } },
      tareasCrm: { orderBy: { fechaVencimiento: 'asc' }, include: { asignado: { select: { id: true, nombre: true, apellidos: true } } } },
      notasCrm: { orderBy: [{ fijada: 'desc' }, { createdAt: 'desc' }], include: { autor: { select: { id: true, nombre: true, apellidos: true } } } },
      archivosCrm: { orderBy: { createdAt: 'desc' }, include: { subidoPor: { select: { id: true, nombre: true } } } },
    },
  });
}

export async function crearContacto(datos: {
  nombre: string; apellidos?: string; empresa?: string; telefono?: string; email?: string;
  direccion?: string; localidad?: string; provincia?: string; codigoPostal?: string;
  origen?: string; tipoInteres?: string; comercialId?: string;
}, usuarioId: string) {
  const contacto = await prisma.contacto.create({
    data: {
      nombre: datos.nombre, apellidos: datos.apellidos || '',
      empresa: datos.empresa || null, telefono: datos.telefono || null, email: datos.email || null,
      direccion: datos.direccion || null, localidad: datos.localidad || null,
      provincia: datos.provincia || null, codigoPostal: datos.codigoPostal || null,
      origen: datos.origen as any || null, tipoInteres: datos.tipoInteres as any || null,
      comercialId: datos.comercialId || null,
    },
  });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_CREADO', entidad: 'contacto', entidadId: contacto.id, detalle: JSON.stringify({ nombre: contacto.nombre }) } });
  return contacto;
}

export async function actualizarContacto(id: string, datos: Record<string, any>, usuarioId: string) {
  const contacto = await prisma.contacto.update({ where: { id }, data: datos });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_ACTUALIZADO', entidad: 'contacto', entidadId: id, detalle: JSON.stringify(datos) } });
  return contacto;
}

export async function convertirACliente(contactoId: string, usuarioId: string) {
  const c = await prisma.contacto.findUnique({ where: { id: contactoId } });
  if (!c) throw new Error('Contacto no encontrado');
  if (c.clienteId) throw new Error('Ya convertido');
  const cliente = await prisma.cliente.create({
    data: { nombre: c.nombre, apellidos: c.apellidos, telefono: c.telefono, email: c.email, direccion: c.direccion, localidad: c.localidad, provincia: c.provincia, codigoPostal: c.codigoPostal },
  });
  await prisma.contacto.update({ where: { id: contactoId }, data: { clienteId: cliente.id, estado: 'CLIENTE' } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'CONTACTO_CONVERTIDO_CLIENTE', entidad: 'contacto', entidadId: contactoId, detalle: JSON.stringify({ clienteId: cliente.id }) } });
  return cliente;
}

// ═══ TRATOS ═══

const ESTADOS_TRATO_ORDEN: Record<string, number> = {
  NUEVO_CONTACTO: 0, VISITA_AGENDADA: 1, A_LA_ESPERA_PRESUPUESTO: 2,
  PRESUPUESTO_ENVIADO: 3, NEGOCIACION: 4, GANADO: 5, PERDIDO: 6,
};

export async function listarTratos(filtros: { contactoId?: string; estado?: string; comercialId?: string }) {
  const where: any = {};
  if (filtros.contactoId) where.contactoId = filtros.contactoId;
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.comercialId) where.contacto = { comercialId: filtros.comercialId };
  return prisma.trato.findMany({
    where,
    include: {
      contacto: { select: { id: true, nombre: true, apellidos: true, comercialId: true, comercial: { select: { id: true, nombre: true, apellidos: true } } } },
      obra: { select: { id: true, codigo: true, estado: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function obtenerPipeline(comercialId?: string) {
  const where: any = {};
  if (comercialId) where.contacto = { comercialId };
  const tratos = await prisma.trato.findMany({ where, select: { estado: true, importe: true } });
  return Object.keys(ESTADOS_TRATO_ORDEN).map(estado => ({
    estado, orden: ESTADOS_TRATO_ORDEN[estado],
    conteo: tratos.filter(t => t.estado === estado).length,
    valor: tratos.filter(t => t.estado === estado).reduce((s, t) => s + (t.importe || 0), 0),
  }));
}

export async function crearTrato(datos: { contactoId: string; titulo: string; tipo?: string; potenciaEstimada?: number; importe?: number; notas?: string }, usuarioId: string) {
  const contacto = await prisma.contacto.findUnique({ where: { id: datos.contactoId } });
  if (!contacto) throw new Error('Contacto no encontrado');
  const trato = await prisma.trato.create({
    data: { contactoId: datos.contactoId, titulo: datos.titulo, tipo: datos.tipo as any || null, potenciaEstimada: datos.potenciaEstimada || null, importe: datos.importe || null, estado: 'NUEVO_CONTACTO', notas: datos.notas || null },
  });
  if (contacto.estado === 'POSIBLE_CLIENTE') await prisma.contacto.update({ where: { id: datos.contactoId }, data: { estado: 'CUALIFICADO' } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TRATO_CREADO', entidad: 'trato', entidadId: trato.id, detalle: JSON.stringify({ titulo: trato.titulo }) } });
  return trato;
}

export async function avanzarTrato(tratoId: string, nuevoEstado: EstadoTrato, usuarioId: string, extras?: { motivoPerdido?: string }) {
  const anterior = await prisma.trato.findUnique({ where: { id: tratoId } });
  if (!anterior) throw new Error('Trato no encontrado');
  const data: any = { estado: nuevoEstado };
  if (nuevoEstado === 'PERDIDO' && extras?.motivoPerdido) data.motivoPerdido = extras.motivoPerdido;
  if (nuevoEstado === 'GANADO') data.fechaCierre = new Date();
  const trato = await prisma.trato.update({ where: { id: tratoId }, data });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TRATO_ESTADO_CAMBIADO', entidad: 'trato', entidadId: tratoId, detalle: JSON.stringify({ antes: anterior.estado, despues: nuevoEstado }) } });
  return trato;
}

export async function convertirTratoAObra(tratoId: string, usuarioId: string) {
  const trato = await prisma.trato.findUnique({ where: { id: tratoId }, include: { contacto: true } });
  if (!trato) throw new Error('Trato no encontrado');
  if (trato.estado !== 'GANADO') throw new Error('Solo tratos GANADOS');
  if (trato.obraId) throw new Error('Ya tiene obra');

  let clienteId = trato.contacto.clienteId;
  if (!clienteId) { const cl = await convertirACliente(trato.contactoId, usuarioId); clienteId = cl.id; }

  const ahora = new Date();
  const prefix = `A-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.obra.count({ where: { codigo: { startsWith: prefix } } });
  const codigo = `${prefix}-${String(count + 1).padStart(3, '0')}`;

  const obra = await prisma.obra.create({
    data: { codigo, clienteId: clienteId!, tipo: trato.tipo || 'RESIDENCIAL', estado: 'REVISION_TECNICA', potenciaKwp: trato.potenciaEstimada || null, presupuestoTotal: trato.importe || 0, comercialId: trato.contacto.comercialId || null, notas: trato.notas || null },
  });
  await prisma.trato.update({ where: { id: tratoId }, data: { obraId: obra.id } });
  await prisma.actividad.create({ data: { usuarioId, obraId: obra.id, accion: 'OBRA_CREADA_DESDE_TRATO', entidad: 'obra', entidadId: obra.id, detalle: JSON.stringify({ tratoId, codigo }) } });
  return obra;
}

// ═══ TAREAS CRM ═══

export async function listarTareas(filtros: { asignadoId?: string; contactoId?: string; estado?: string; soloHoy?: boolean; soloPendientes?: boolean }) {
  const where: any = {};
  if (filtros.asignadoId) where.asignadoId = filtros.asignadoId;
  if (filtros.contactoId) where.contactoId = filtros.contactoId;
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.soloPendientes) where.estado = { in: ['PENDIENTE', 'EN_CURSO'] };
  if (filtros.soloHoy) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const man = new Date(hoy); man.setDate(man.getDate() + 1);
    where.fechaVencimiento = { gte: hoy, lt: man };
  }
  return prisma.tareaCrm.findMany({
    where,
    include: { contacto: { select: { id: true, nombre: true, apellidos: true } }, asignado: { select: { id: true, nombre: true, apellidos: true } } },
    orderBy: [{ estado: 'asc' }, { fechaVencimiento: 'asc' }],
  });
}

export async function crearTarea(datos: { contactoId?: string; tratoId?: string; asignadoId: string; tipo: string; titulo: string; descripcion?: string; fechaVencimiento?: string; prioridad?: string; latitud?: number; longitud?: number }, usuarioId: string) {
  const tarea = await prisma.tareaCrm.create({
    data: { contactoId: datos.contactoId || null, tratoId: datos.tratoId || null, asignadoId: datos.asignadoId, tipo: datos.tipo as any, titulo: datos.titulo, descripcion: datos.descripcion || null, fechaVencimiento: datos.fechaVencimiento ? new Date(datos.fechaVencimiento) : null, prioridad: datos.prioridad || 'MEDIA', latitud: datos.latitud || null, longitud: datos.longitud || null },
  });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TAREA_CRM_CREADA', entidad: 'tarea_crm', entidadId: tarea.id } });
  return tarea;
}

export async function completarTarea(tareaId: string, usuarioId: string) {
  const t = await prisma.tareaCrm.update({ where: { id: tareaId }, data: { estado: 'COMPLETADA', fechaCompletada: new Date() } });
  await prisma.actividad.create({ data: { usuarioId, accion: 'TAREA_CRM_COMPLETADA', entidad: 'tarea_crm', entidadId: tareaId } });
  return t;
}

export async function actualizarTarea(tareaId: string, datos: Record<string, any>) {
  if (datos.fechaVencimiento) datos.fechaVencimiento = new Date(datos.fechaVencimiento);
  if (datos.estado === 'COMPLETADA') datos.fechaCompletada = new Date();
  return prisma.tareaCrm.update({ where: { id: tareaId }, data: datos });
}

// ═══ NOTAS ═══
export async function crearNota(contactoId: string, contenido: string, usuarioId: string) {
  return prisma.notaCrm.create({ data: { contactoId, autorId: usuarioId, contenido } });
}
export async function fijarNota(notaId: string, fijada: boolean) {
  return prisma.notaCrm.update({ where: { id: notaId }, data: { fijada } });
}
export async function eliminarNota(notaId: string) {
  return prisma.notaCrm.delete({ where: { id: notaId } });
}

// ═══ ARCHIVOS ═══
export async function registrarArchivo(datos: { contactoId: string; nombre: string; rutaArchivo: string; mimeType?: string; tamanoBytes?: number; descripcion?: string }, usuarioId: string) {
  return prisma.archivoCrm.create({ data: { ...datos, mimeType: datos.mimeType || null, tamanoBytes: datos.tamanoBytes || null, descripcion: datos.descripcion || null, subidoPorId: usuarioId } });
}
export async function eliminarArchivo(archivoId: string) {
  return prisma.archivoCrm.delete({ where: { id: archivoId } });
}

// ═══ DASHBOARD COMERCIAL ═══
export async function dashboardComercial(comercialId: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const man = new Date(hoy); man.setDate(man.getDate() + 1);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [totalContactos, contactosActivos, tratosAbiertos, tratosGanadosMes, valorGanadoMes, tareasHoy, tareasPendientes] = await Promise.all([
    prisma.contacto.count({ where: { comercialId, deletedAt: null } }),
    prisma.contacto.count({ where: { comercialId, deletedAt: null, estado: { notIn: ['PERDIDO', 'INACTIVO'] } } }),
    prisma.trato.count({ where: { contacto: { comercialId }, estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.count({ where: { contacto: { comercialId }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { contacto: { comercialId }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.tareaCrm.count({ where: { asignadoId: comercialId, estado: { in: ['PENDIENTE', 'EN_CURSO'] }, fechaVencimiento: { gte: hoy, lt: man } } }),
    prisma.tareaCrm.count({ where: { asignadoId: comercialId, estado: { in: ['PENDIENTE', 'EN_CURSO'] } } }),
  ]);
  return { totalContactos, contactosActivos, tratosAbiertos, tratosGanadosMes, valorGanadoMes: valorGanadoMes._sum.importe || 0, tareasHoy, tareasPendientes };
}

// ═══ KPIs DIRECCIÓN ═══
export async function kpisGeneralesCRM() {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const [totalContactos, tratosAbiertos, tratosGanados, tratosGanadosMes, valorPipeline, valorGanadoMes, totalPerdidos] = await Promise.all([
    prisma.contacto.count({ where: { deletedAt: null } }),
    prisma.trato.count({ where: { estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.count({ where: { estado: 'GANADO' } }),
    prisma.trato.count({ where: { estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    prisma.trato.aggregate({ _sum: { importe: true }, where: { estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
    prisma.trato.count({ where: { estado: 'PERDIDO' } }),
  ]);
  const tasaConversion = (tratosGanados + totalPerdidos) > 0 ? Math.round((tratosGanados / (tratosGanados + totalPerdidos)) * 100) : 0;
  return { totalContactos, tratosAbiertos, tratosGanadosMes, valorPipeline: valorPipeline._sum.importe || 0, valorGanadoMes: valorGanadoMes._sum.importe || 0, tasaConversion };
}

// ═══ RANKING COMERCIALES ═══
export async function rankingComerciales() {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const comerciales = await prisma.usuario.findMany({
    where: { rol: 'COMERCIAL', activo: true, deletedAt: null },
    select: { id: true, nombre: true, apellidos: true, zona: true, objetivoMensual: true, contactosComercial: { where: { deletedAt: null }, select: { id: true } } },
  });
  const results = await Promise.all(comerciales.map(async (c) => {
    const [tratosG, valorG, tratosA] = await Promise.all([
      prisma.trato.count({ where: { contacto: { comercialId: c.id }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
      prisma.trato.aggregate({ _sum: { importe: true }, where: { contacto: { comercialId: c.id }, estado: 'GANADO', fechaCierre: { gte: inicioMes } } }),
      prisma.trato.count({ where: { contacto: { comercialId: c.id }, estado: { notIn: ['GANADO', 'PERDIDO'] } } }),
    ]);
    return { id: c.id, nombre: `${c.nombre} ${c.apellidos}`, zona: c.zona, totalContactos: c.contactosComercial.length, tratosAbiertos: tratosA, tratosGanadosMes: tratosG, valorGanadoMes: valorG._sum.importe || 0, objetivoMensual: c.objetivoMensual || 0, cumplimiento: c.objetivoMensual ? Math.round(((valorG._sum.importe || 0) / c.objetivoMensual) * 100) : 0 };
  }));
  return results.sort((a, b) => b.valorGanadoMes - a.valorGanadoMes);
}

// ═══ CONFIG SISTEMA ═══
export async function obtenerConfigSistema() {
  let config = await prisma.configSistema.findUnique({ where: { id: 'singleton' } });
  if (!config) {
    config = await prisma.configSistema.create({ data: { id: 'singleton' } });
  }
  return config;
}

export async function actualizarConfigSistema(datos: Record<string, any>, usuarioId: string) {
  const config = await prisma.configSistema.upsert({
    where: { id: 'singleton' },
    update: datos,
    create: { id: 'singleton', ...datos },
  });
  await prisma.actividad.create({
    data: { usuarioId, accion: 'CONFIG_ACTUALIZADA', entidad: 'config_sistema', entidadId: 'singleton', detalle: JSON.stringify(datos) },
  });
  return config;
}
