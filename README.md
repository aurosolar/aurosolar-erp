# ☀️ Auro Solar ERP

ERP WebApp para **Auro Solar Energía** — Instaladora fotovoltaica y renovables en Extremadura.

## Stack técnico

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend:** Next.js API Routes (lógica en `/src/services/`)
- **Base de datos:** PostgreSQL 16 + Prisma ORM
- **Auth:** JWT con cookies httpOnly (7 días)
- **RBAC:** 7 roles, ~40 permisos granulares
- **Logger:** Winston con rotación diaria
- **PWA:** Manifest + Service Worker (básico)
- **Despliegue:** VPS OVH + Nginx + PM2

## Arquitectura

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Next.js React)             │
│  ┌─────────────┬─────────────┬──────────────┐    │
│  │  Dashboard   │   Campo     │  Portal      │    │
│  │  (oficina)   │(instalador) │  (cliente)   │    │
│  └──────┬──────┴──────┬──────┴──────┬───────┘    │
│         └─────────────┼─────────────┘            │
│                       │ fetch()                  │
├───────────────────────┼──────────────────────────┤
│              API ROUTES (/api/*)                  │
│         withAuth() → validación → response       │
├───────────────────────┼──────────────────────────┤
│              SERVICES (/services/*)               │
│    ⭐ TODA LA LÓGICA DE NEGOCIO VIVE AQUÍ ⭐     │
├───────────────────────┼──────────────────────────┤
│              PRISMA ORM → PostgreSQL              │
└──────────────────────────────────────────────────┘
```

### Regla fundamental

> **La lógica de negocio vive EXCLUSIVAMENTE en `/src/services/`.**
> Ni en API Routes, ni en componentes React, ni en middleware.

## Estructura del proyecto

```
aurosolar-erp/
├── prisma/
│   ├── schema.prisma          # 30+ entidades, enums, relaciones
│   └── seed.ts                # Admin + catálogos iniciales
├── src/
│   ├── app/
│   │   ├── api/               # ~80 API Routes (REST)
│   │   │   ├── auth/          # Login, logout, me
│   │   │   ├── obras/         # CRUD + estados
│   │   │   ├── campo/         # Check-in, fotos, validación, gastos, incidencias
│   │   │   ├── cobros/        # Pagos, alertas, efectivo
│   │   │   ├── portal/        # API del portal cliente (aislado)
│   │   │   ├── crm/           # CRM V1 (leads)
│   │   │   ├── crm-v2/        # CRM V2 (contactos/tratos)
│   │   │   └── ...            # incidencias, materiales, planificación, etc.
│   │   ├── (dashboard)/       # Vistas de oficina (DIRECCION, ADMIN, etc.)
│   │   ├── (campo)/           # Vistas de campo (INSTALADOR, JEFE_INST.)
│   │   ├── (portal)/          # Vistas del portal cliente (CLIENTE)
│   │   ├── login/             # Login público
│   │   └── page.tsx           # Redirect según rol
│   ├── components/            # React reutilizables
│   ├── lib/
│   │   ├── prisma.ts          # Singleton Prisma
│   │   ├── auth.ts            # JWT + RBAC (~40 permisos)
│   │   ├── api.ts             # withAuth(), apiOk(), apiError()
│   │   ├── logger.ts          # Winston con rotación
│   │   ├── storage.ts         # StorageProvider (abstracción)
│   │   ├── useSession.ts      # Hook cliente para sesión
│   │   └── constants.ts       # Constantes globales
│   └── services/              # 22 services con lógica de negocio
├── public/
│   ├── manifest.json          # PWA
│   ├── sw.js                  # Service Worker
│   └── icons/                 # Iconos PWA
├── logs/                      # Logs Winston (rotación diaria)
└── ecosystem.config.js        # PM2
```

## Roles y acceso

| Rol | Dashboard | Campo | Portal | CRM |
|-----|-----------|-------|--------|-----|
| ADMIN | ✅ total | — | — | ✅ |
| DIRECCION | ✅ total | — | — | ✅ |
| JEFE_INSTALACIONES | ✅ parcial | ✅ | — | — |
| INSTALADOR | — | ✅ | — | — |
| COMERCIAL | ✅ (sus obras) | — | — | ✅ |
| ADMINISTRACION | ✅ (cobros/docs) | — | — | — |
| CLIENTE | — | — | ✅ (aislado) | — |

## Convenciones

- **API:** Toda API route incluye `export const dynamic = 'force-dynamic'`
- **IDs:** UUID v4 (Prisma @default(uuid()))
- **Código obra:** `A-YYYY-MM-XXX` (auto-generado)
- **Importes:** En **céntimos** (Int) internamente → euros en UI
- **Fechas:** ISO 8601 en BD, `dd/mm/yyyy HH:mm` en UI
- **Soft delete:** `deletedAt` (nullable) en entidades principales
- **Auditoría:** Tabla `actividades` para cambios relevantes

## Variables de entorno

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/aurosolar
NEXTAUTH_SECRET=tu-secreto-jwt-seguro-aquí    # ⚠️ OBLIGATORIO
NODE_ENV=production
PORT=3000
```

**⚠️ NEXTAUTH_SECRET es obligatorio.** La app no arranca sin él.

## Setup local

```bash
git clone git@github.com:TU_ORG/aurosolar-erp.git
cd aurosolar-erp
npm install
cp .env.example .env  # Editar con tu DATABASE_URL local
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Deploy en VPS

```bash
cd /var/www/erp
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
pm2 restart aurosolar-erp
```

## Credenciales iniciales

- **Email:** admin@aurosolar.es
- **Password:** AuroSolar2026!
- **⚠️ Cambiar inmediatamente tras primer login**

## Estado del proyecto

Consultar `AUROSOLAR_ERP_Diagnostico_Completo.md` para el diagnóstico técnico detallado y el roadmap de sprints.
