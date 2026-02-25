// src/services/crm.service.ts
// ═══════════════════════════════════════════
// SERVICIO CRM — Leads, Pipeline, Visitas, Conversión
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Tipos ──
export interface CrearLeadInput {
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  origen: string;
  tipo: string;
  potenciaEstimada?: number;
  importeEstimado?: number;
  notas?: string;
}

// ── Listar leads con filtros ──
export async function listarLeads(filtros?: {
  estado?: string;
  comercialId?: string;
  q?: string;
}) {
  return prisma.lead.findMany({
    where: {
      deletedAt: null,
      ...(filtros?.estado ? { estado: filtros.estado as any } : {}),
      ...(filtros?.comercialId ? { comercialId: filtros.comercialId } : {}),
      ...(filtros?.q ? {
        OR: [
          { nombre: { contains: filtros.q, mode: 'insensitive' as any } },
          { apellidos: { contains: filtros.q, mode: 'insensitive' as any } },
          { telefono: { contains: filtros.q } },
        ],
      } : {}),
    },
    include: {
      comercial: { select: { id: true, nombre: true } },
      visitas: { orderBy: { fecha: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Crear lead ──
export async function crearLead(input: CrearLeadInput, comercialId: string) {
  const lead = await prisma.lead.create({
    data: {
      nombre: input.nombre,
      apellidos: input.apellidos || '',
      telefono: input.telefono,
      email: input.email,
      direccion: input.direccion,
      localidad: input.localidad,
      provincia: input.provincia,
      origen: input.origen as any,
      tipo: input.tipo as any,
      potenciaEstimada: input.potenciaEstimada,
      importeEstimado: input.importeEstimado,
      notas: input.notas,
      comercialId,
    },
  });

  await prisma.actividad.create({
    data: {
      usuarioId: comercialId,
      accion: 'LEAD_CREADO',
      entidad: 'lead',
      entidadId: lead.id,
      detalle: JSON.stringify({ nombre: input.nombre, origen: input.origen }),
    },
  });

  logger.info('lead_creado', { id: lead.id, nombre: input.nombre, comercial: comercialId });
  return lead;
}

// ── Avanzar estado de lead ──
const TRANSICIONES_LEAD: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'NO_INTERESADO'],
  CONTACTADO: ['VISITA_PROGRAMADA', 'PRESUPUESTO_ENVIADO', 'NO_INTERESADO'],
  VISITA_PROGRAMADA: ['PRESUPUESTO_ENVIADO', 'NO_INTERESADO', 'CONTACTADO'],
  PRESUPUESTO_ENVIADO: ['ACEPTADO', 'NO_INTERESADO', 'CONTACTADO'],
  ACEPTADO: ['CONVERTIDO'],
  NO_INTERESADO: ['CONTACTADO'], // Re-contacto
};

export async function avanzarLead(leadId: string, nuevoEstado: string, usuarioId: string, nota?: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const permitidos = TRANSICIONES_LEAD[lead.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    throw new Error(`No se puede pasar de ${lead.estado} a ${nuevoEstado}`);
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { estado: nuevoEstado as any },
  });

  await prisma.actividad.create({
    data: {
      usuarioId,
      accion: 'LEAD_ESTADO_CAMBIADO',
      entidad: 'lead',
      entidadId: leadId,
      detalle: JSON.stringify({ anterior: lead.estado, nuevo: nuevoEstado, nota }),
    },
  });

  return updated;
}

// ── Convertir lead a obra ──
export async function convertirLead(leadId: string, usuarioId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estado !== 'ACEPTADO') throw new Error('El lead debe estar en estado ACEPTADO para convertir');

  // Crear o buscar cliente
  let clienteId = lead.clienteId;
  if (!clienteId) {
    const cliente = await prisma.cliente.create({
      data: {
        nombre: lead.nombre,
        apellidos: lead.apellidos,
        telefono: lead.telefono,
        email: lead.email,
        direccion: lead.direccion,
        localidad: lead.localidad,
        provincia: lead.provincia,
      },
    });
    clienteId = cliente.id;
  }

  // Generar código de obra
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.obra.count({
    where: {
      createdAt: {
        gte: new Date(yyyy, now.getMonth(), 1),
        lt: new Date(yyyy, now.getMonth() + 1, 1),
      },
    },
  });
  const codigo = `A-${yyyy}-${mm}-${String(count + 1).padStart(3, '0')}`;

  // Crear obra
  const obra = await prisma.obra.create({
    data: {
      codigo,
      clienteId,
      tipo: lead.tipo,
      estado: 'REVISION_TECNICA',
      direccionInstalacion: lead.direccion,
      localidad: lead.localidad,
      provincia: lead.provincia,
      potenciaKwp: lead.potenciaEstimada,
      presupuestoTotal: lead.importeEstimado || 0,
      comercialId: lead.comercialId,
    },
  });

  // Marcar lead como convertido
  await prisma.lead.update({
    where: { id: leadId },
    data: { estado: 'CONVERTIDO', obraId: obra.id, clienteId },
  });

  await prisma.actividad.create({
    data: {
      obraId: obra.id,
      usuarioId,
      accion: 'LEAD_CONVERTIDO',
      entidad: 'obra',
      entidadId: obra.id,
      detalle: JSON.stringify({ leadId, codigo: obra.codigo }),
    },
  });

  logger.info('lead_convertido', { leadId, obraId: obra.id, codigo: obra.codigo });
  return { lead, obra };
}

// ── Registrar visita ──
export async function registrarVisita(input: {
  leadId: string;
  fecha: Date;
  resultado: string;
  notas?: string;
}, comercialId: string) {
  const visita = await prisma.visita.create({
    data: {
      leadId: input.leadId,
      comercialId,
      fecha: input.fecha,
      resultado: input.resultado,
      notas: input.notas,
    },
  });

  // Si resultado es "Pide presupuesto", avanzar lead automáticamente
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (lead && input.resultado === 'PIDE_PRESUPUESTO' && lead.estado === 'VISITA_PROGRAMADA') {
    await prisma.lead.update({
      where: { id: input.leadId },
      data: { estado: 'PRESUPUESTO_ENVIADO' },
    });
  }

  await prisma.actividad.create({
    data: {
      usuarioId: comercialId,
      accion: 'VISITA_REGISTRADA',
      entidad: 'visita',
      entidadId: visita.id,
      detalle: JSON.stringify({ leadId: input.leadId, resultado: input.resultado }),
    },
  });

  return visita;
}

// ── Pipeline resumen ──
export async function pipelineResumen() {
  const estados = ['NUEVO', 'CONTACTADO', 'VISITA_PROGRAMADA', 'PRESUPUESTO_ENVIADO', 'ACEPTADO'];
  const resultado = [];

  for (const estado of estados) {
    const leads = await prisma.lead.findMany({
      where: { estado: estado as any, deletedAt: null },
      select: { importeEstimado: true },
    });
    resultado.push({
      estado,
      conteo: leads.length,
      valorEstimado: leads.reduce((sum, l) => sum + (l.importeEstimado || 0), 0),
    });
  }

  return resultado;
}

// ── Dashboard comercial individual ──
export async function dashboardComercial(comercialId: string) {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const leadsMes = await prisma.lead.count({
    where: { comercialId, createdAt: { gte: inicioMes }, deletedAt: null },
  });

  const convertidosMes = await prisma.lead.count({
    where: { comercialId, estado: 'CONVERTIDO', updatedAt: { gte: inicioMes } },
  });

  const totalLeads = await prisma.lead.count({
    where: { comercialId, deletedAt: null },
  });

  const obrasComercial = await prisma.obra.findMany({
    where: { comercialId, createdAt: { gte: inicioMes }, deletedAt: null },
    select: { presupuestoTotal: true },
  });
  const volumenMes = obrasComercial.reduce((sum, o) => sum + o.presupuestoTotal, 0);

  const comercial = await prisma.usuario.findUnique({
    where: { id: comercialId },
    select: { objetivoMensual: true },
  });
  const objetivo = comercial?.objetivoMensual || 0;

  return {
    leadsMes,
    convertidosMes,
    tasaConversion: totalLeads > 0 ? Math.round((convertidosMes / totalLeads) * 100) : 0,
    volumenMes,
    objetivo,
    porcentajeObjetivo: objetivo > 0 ? Math.round((volumenMes / objetivo) * 100) : 0,
  };
}

// ── Ranking comerciales (para dirección) ──
export async function rankingComerciales() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const comerciales = await prisma.usuario.findMany({
    where: { rol: 'COMERCIAL', activo: true },
    select: { id: true, nombre: true, objetivoMensual: true },
  });

  const ranking = [];
  for (const com of comerciales) {
    const leads = await prisma.lead.count({
      where: { comercialId: com.id, createdAt: { gte: inicioMes }, deletedAt: null },
    });
    const convertidos = await prisma.lead.count({
      where: { comercialId: com.id, estado: 'CONVERTIDO', updatedAt: { gte: inicioMes } },
    });
    const obras = await prisma.obra.findMany({
      where: { comercialId: com.id, createdAt: { gte: inicioMes }, deletedAt: null },
      select: { presupuestoTotal: true },
    });
    const volumen = obras.reduce((sum, o) => sum + o.presupuestoTotal, 0);

    ranking.push({
      id: com.id,
      nombre: com.nombre,
      leads,
      convertidos,
      volumen,
      objetivo: com.objetivoMensual || 0,
      porcentaje: com.objetivoMensual ? Math.round((volumen / com.objetivoMensual) * 100) : 0,
    });
  }

  return ranking.sort((a, b) => b.volumen - a.volumen);
}
