// src/services/configuracion.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Listar catálogos por tipo ──
export async function listarCatalogos(tipo?: string) {
  if (tipo) {
    return prisma.catalogo.findMany({
      where: { tipo },
      orderBy: { orden: 'asc' },
    });
  }
  return prisma.catalogo.findMany({ orderBy: [{ tipo: 'asc' }, { orden: 'asc' }] });
}

// ── Tipos de catálogo disponibles ──
export async function tiposCatalogo() {
  const result = await prisma.catalogo.groupBy({
    by: ['tipo'],
    _count: true,
    orderBy: { tipo: 'asc' },
  });
  return result.map(r => ({ tipo: r.tipo, count: r._count }));
}

// ── Crear entrada de catálogo ──
export async function crearCatalogo(input: {
  tipo: string; codigo: string; nombre: string;
  orden?: number; metadata?: string;
}) {
  const catalogo = await prisma.catalogo.create({
    data: {
      tipo: input.tipo.toUpperCase(),
      codigo: input.codigo.toUpperCase(),
      nombre: input.nombre,
      orden: input.orden || 0,
      metadata: input.metadata,
    },
  });
  logger.info('catalogo_creado', { tipo: input.tipo, codigo: input.codigo });
  return catalogo;
}

// ── Actualizar entrada ──
export async function actualizarCatalogo(id: string, input: {
  nombre?: string; orden?: number; activo?: boolean; metadata?: string;
}) {
  return prisma.catalogo.update({ where: { id }, data: input });
}

// ── Eliminar entrada ──
export async function eliminarCatalogo(id: string) {
  return prisma.catalogo.delete({ where: { id } });
}

// ── Estadísticas del sistema ──
export async function estadisticasSistema() {
  const [usuarios, obras, leads, incidencias, activos, notificaciones] = await Promise.all([
    prisma.usuario.count({ where: { activo: true } }),
    prisma.obra.count({ where: { deletedAt: null } }),
    prisma.lead.count(),
    prisma.incidencia.count(),
    prisma.activoInstalado.count({ where: { activo: true } }),
    prisma.notificacion.count(),
  ]);
  return { usuarios, obras, leads, incidencias, activos, notificaciones };
}

// ── Seed catálogos por defecto ──
export async function seedCatalogos() {
  const defaults = [
    { tipo: 'TIPO_INSTALACION', items: [
      { codigo: 'RESIDENCIAL', nombre: 'Residencial', orden: 1 },
      { codigo: 'INDUSTRIAL', nombre: 'Industrial', orden: 2 },
      { codigo: 'AGROINDUSTRIAL', nombre: 'Agroindustrial', orden: 3 },
      { codigo: 'BATERIA', nombre: 'Batería', orden: 4 },
      { codigo: 'AEROTERMIA', nombre: 'Aerotermia', orden: 5 },
      { codigo: 'BESS', nombre: 'BESS', orden: 6 },
      { codigo: 'BACKUP', nombre: 'Backup', orden: 7 },
    ]},
    { tipo: 'METODO_PAGO', items: [
      { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', orden: 1 },
      { codigo: 'EFECTIVO', nombre: 'Efectivo', orden: 2 },
      { codigo: 'FINANCIACION', nombre: 'Financiación', orden: 3 },
      { codigo: 'CHEQUE', nombre: 'Cheque', orden: 4 },
      { codigo: 'BIZUM', nombre: 'Bizum', orden: 5 },
    ]},
    { tipo: 'ORIGEN_LEAD', items: [
      { codigo: 'WEB', nombre: 'Web', orden: 1 },
      { codigo: 'RECOMENDACION', nombre: 'Recomendación', orden: 2 },
      { codigo: 'FERIA', nombre: 'Feria', orden: 3 },
      { codigo: 'PUERTA_FRIA', nombre: 'Puerta fría', orden: 4 },
      { codigo: 'REPETIDOR', nombre: 'Repetidor', orden: 5 },
      { codigo: 'OTRO', nombre: 'Otro', orden: 6 },
    ]},
    { tipo: 'GRAVEDAD_INCIDENCIA', items: [
      { codigo: 'ALTA', nombre: 'Alta', orden: 1 },
      { codigo: 'MEDIA', nombre: 'Media', orden: 2 },
      { codigo: 'BAJA', nombre: 'Baja', orden: 3 },
    ]},
    { tipo: 'TIPO_ACTIVO', items: [
      { codigo: 'PANEL', nombre: 'Panel', orden: 1 },
      { codigo: 'INVERSOR', nombre: 'Inversor', orden: 2 },
      { codigo: 'BATERIA', nombre: 'Batería', orden: 3 },
      { codigo: 'ESTRUCTURA', nombre: 'Estructura', orden: 4 },
      { codigo: 'AEROTERMIA', nombre: 'Aerotermia', orden: 5 },
      { codigo: 'OPTIMIZADOR', nombre: 'Optimizador', orden: 6 },
      { codigo: 'MONITORIZACION', nombre: 'Monitorización', orden: 7 },
    ]},
  ];

  let created = 0;
  for (const cat of defaults) {
    for (const item of cat.items) {
      await prisma.catalogo.upsert({
        where: { tipo_codigo: { tipo: cat.tipo, codigo: item.codigo } },
        update: {},
        create: { tipo: cat.tipo, ...item },
      });
      created++;
    }
  }
  return { created };
}
