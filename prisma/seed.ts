// prisma/seed.ts
// Datos iniciales: usuario admin + catálogos
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding base de datos...');

  // ── Usuario Admin ──
  const adminPassword = await bcrypt.hash('AuroSolar2026!', 12);
  await prisma.usuario.upsert({
    where: { email: 'admin@aurosolar.es' },
    update: {},
    create: {
      email: 'admin@aurosolar.es',
      nombre: 'Administrador',
      apellidos: 'Sistema',
      passwordHash: adminPassword,
      rol: 'ADMIN',
      activo: true,
    },
  });
  console.log('  ✓ Usuario admin creado (admin@aurosolar.es / AuroSolar2026!)');

  // ── Catálogos de estados ──
  const catalogos = [
    // Estados de obra
    { tipo: 'ESTADO_OBRA', codigo: 'REVISION_TECNICA', nombre: 'Revisión técnica', orden: 1, metadata: '{"color":"#7C3AED","icon":"🔍"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'PREPARANDO', nombre: 'Preparando', orden: 2, metadata: '{"color":"#D97706","icon":"📋"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'PENDIENTE_MATERIAL', nombre: 'Pendiente material', orden: 3, metadata: '{"color":"#D97706","icon":"📦"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'PROGRAMADA', nombre: 'Programada', orden: 4, metadata: '{"color":"#2563EB","icon":"📅"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'INSTALANDO', nombre: 'Instalando', orden: 5, metadata: '{"color":"#F5820A","icon":"⚡"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'TERMINADA', nombre: 'Terminada', orden: 6, metadata: '{"color":"#16A34A","icon":"✅"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'INCIDENCIA', nombre: 'Incidencia', orden: 7, metadata: '{"color":"#DC2626","icon":"⚠️"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'LEGALIZACION', nombre: 'Legalización', orden: 8, metadata: '{"color":"#7C3AED","icon":"📋"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'LEGALIZADA', nombre: 'Legalizada', orden: 9, metadata: '{"color":"#16A34A","icon":"✅"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'COMPLETADA', nombre: 'Completada', orden: 10, metadata: '{"color":"#16A34A","icon":"🏆"}' },
    { tipo: 'ESTADO_OBRA', codigo: 'CANCELADA', nombre: 'Cancelada', orden: 11, metadata: '{"color":"#6B7280","icon":"❌"}' },

    // Tipos de instalación
    { tipo: 'TIPO_INSTALACION', codigo: 'RESIDENCIAL', nombre: 'Residencial', orden: 1, metadata: '{"icon":"🏠"}' },
    { tipo: 'TIPO_INSTALACION', codigo: 'INDUSTRIAL', nombre: 'Industrial', orden: 2, metadata: '{"icon":"🏭"}' },
    { tipo: 'TIPO_INSTALACION', codigo: 'AGROINDUSTRIAL', nombre: 'Agroindustrial', orden: 3, metadata: '{"icon":"🌾"}' },
    { tipo: 'TIPO_INSTALACION', codigo: 'BATERIA', nombre: 'Batería', orden: 4, metadata: '{"icon":"🔋"}' },
    { tipo: 'TIPO_INSTALACION', codigo: 'AEROTERMIA', nombre: 'Aerotermia', orden: 5, metadata: '{"icon":"🌡️"}' },

    // Métodos de pago
    { tipo: 'METODO_PAGO', codigo: 'TRANSFERENCIA', nombre: 'Transferencia', orden: 1, metadata: '{}' },
    { tipo: 'METODO_PAGO', codigo: 'EFECTIVO', nombre: 'Efectivo', orden: 2, metadata: '{}' },
    { tipo: 'METODO_PAGO', codigo: 'FINANCIACION', nombre: 'Financiación', orden: 3, metadata: '{}' },
    { tipo: 'METODO_PAGO', codigo: 'TARJETA', nombre: 'Tarjeta', orden: 4, metadata: '{}' },
    { tipo: 'METODO_PAGO', codigo: 'DOMICILIACION', nombre: 'Domiciliación', orden: 5, metadata: '{}' },

    // Gravedad incidencias
    { tipo: 'GRAVEDAD', codigo: 'BAJA', nombre: 'Baja', orden: 1, metadata: '{"color":"#2563EB","icon":"🔵"}' },
    { tipo: 'GRAVEDAD', codigo: 'MEDIA', nombre: 'Media', orden: 2, metadata: '{"color":"#D97706","icon":"🟡"}' },
    { tipo: 'GRAVEDAD', codigo: 'ALTA', nombre: 'Alta', orden: 3, metadata: '{"color":"#DC2626","icon":"🔴"}' },
    { tipo: 'GRAVEDAD', codigo: 'CRITICA', nombre: 'Crítica', orden: 4, metadata: '{"color":"#7C3AED","icon":"🟣"}' },
  ];

  for (const cat of catalogos) {
    await prisma.catalogo.upsert({
      where: { tipo_codigo: { tipo: cat.tipo, codigo: cat.codigo } },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✓ ${catalogos.length} catálogos creados`);

  console.log('\n✅ Seed completado');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
