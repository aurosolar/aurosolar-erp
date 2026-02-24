# ☀️ Auro Solar ERP

ERP WebApp para **Auro Solar Energía** — Instaladora fotovoltaica en Extremadura.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend:** Next.js API Routes (lógica en `/src/services/`)
- **Base de datos:** PostgreSQL 16 + Prisma ORM
- **Auth:** JWT con cookies httpOnly
- **Despliegue:** VPS OVH + Nginx + PM2

## Estructura del proyecto

```
aurosolar-erp/
├── prisma/
│   ├── schema.prisma      # Modelo de datos completo
│   └── seed.ts            # Datos iniciales (admin + catálogos)
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API Routes (endpoints REST)
│   │   │   ├── auth/      # Login, logout, sesión
│   │   │   ├── obras/     # CRUD obras
│   │   │   └── health/    # Health check
│   │   ├── layout.tsx     # Layout raíz (fuentes, meta)
│   │   └── page.tsx       # Redirect según rol
│   ├── components/        # Componentes React reutilizables
│   ├── lib/               # Utilidades compartidas
│   │   ├── prisma.ts      # Singleton Prisma
│   │   ├── auth.ts        # Autenticación + RBAC
│   │   ├── api.ts         # Helpers API (withAuth, validación)
│   │   ├── logger.ts      # Winston logger
│   │   └── storage.ts     # StorageProvider (disco → S3)
│   ├── services/          # ⭐ LÓGICA DE NEGOCIO AQUÍ
│   │   └── obras.service.ts
│   └── types/             # TypeScript types
├── public/
│   └── manifest.json      # PWA manifest
├── .github/workflows/
│   └── deploy.yml         # CI/CD GitHub Actions
└── ecosystem.config.js    # PM2 config
```

## Regla fundamental

> **La lógica de negocio vive EXCLUSIVAMENTE en `/src/services/`.**
> Ni en API Routes, ni en componentes React, ni en middleware.

## Setup local

```bash
# 1. Clonar e instalar
git clone git@github.com:TU_ORG/aurosolar-erp.git
cd aurosolar-erp
npm install

# 2. Configurar variables
cp .env.example .env
# Editar .env con tu DATABASE_URL local

# 3. Crear BD y migrar
npx prisma migrate dev

# 4. Seed (usuario admin + catálogos)
npm run db:seed

# 5. Arrancar
npm run dev
```

## Deploy en VPS

```bash
# Primera vez (en el VPS como deploy)
cd /var/www/erp
git clone git@github.com:TU_ORG/aurosolar-erp.git .
cp .env.example .env  # Editar con datos producción
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.js
pm2 save

# Siguientes deploys: automático vía GitHub Actions
```

## Credenciales iniciales

- **Email:** admin@aurosolar.es
- **Password:** AuroSolar2026!
- **⚠️ Cambiar inmediatamente tras primer login**
