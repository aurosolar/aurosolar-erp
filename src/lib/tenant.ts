// src/lib/tenant.ts
// Middleware de Prisma para tenant isolation.
// Añade empresaId automáticamente a todas las queries de los modelos tenant.
// Se activa en withAuth() — cada request autenticado tiene su tenant.

import { prisma } from './prisma';

// Modelos que tienen empresa_id y deben filtrarse por tenant
const TENANT_MODELS = new Set([
  'usuario', 'cliente', 'lead', 'obra', 'documento',
  'incidencia', 'contacto', 'trato', 'tareaCrm',
  'actividad', 'catalogo', 'notificacion', 'configSistema',
]);

export function applyTenantMiddleware(empresaId: string) {
  prisma.$use(async (params, next) => {
    if (!params.model) return next(params);
    const model = params.model.charAt(0).toLowerCase() + params.model.slice(1);

    if (!TENANT_MODELS.has(model)) {
      return next(params);
    }

    // Inyectar empresaId en findMany, findFirst, findUnique, count, aggregate
    if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = { ...params.args.where, empresaId };
    }

    // Inyectar empresaId en create
    if (params.action === 'create') {
      params.args.data = { ...params.args.data, empresaId };
    }

    // Inyectar empresaId en createMany
    if (params.action === 'createMany') {
      params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
        ...d,
        empresaId,
      }));
    }

    // Para update/delete: añadir empresaId al where para evitar cross-tenant
    if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = { ...params.args.where, empresaId };
    }

    return next(params);
  });
}

