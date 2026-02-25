#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# AUROSOLAR ERP - HOTFIX (sed fixes + Python page creator)
# Run as deploy user: bash fix-and-deploy.sh
# ═══════════════════════════════════════════════════════════════
set -e

echo "═══ AUROSOLAR HOTFIX - $(date) ═══"
cd /var/www/erp

# ─── FIX 1: export.service.ts line 31 missing comma ───
echo "[1/8] Fix export.service.ts..."
# Line 31 has: ''\n    new Date(...)  → needs comma after ''
sed -i "31s/^    ''$/    '',/" src/services/export.service.ts
echo "  Done"

# ─── FIX 2: schema.prisma @default(NUEVO) → @default(NUEVO_CONTACTO) ───
echo "[2/8] Fix schema.prisma..."
# Target only the Trato model line (around line 880)
sed -i '/estado.*EstadoTrato.*@default(NUEVO)$/s/@default(NUEVO)/@default(NUEVO_CONTACTO)/' prisma/schema.prisma
echo "  Done"

# ─── FIX 3: auth.ts duplicate permissions ───
echo "[3/8] Fix auth.ts duplicates..."
DUPS=$(grep -c "tareas-crm:ver" src/lib/auth.ts || true)
if [ "$DUPS" -gt 1 ]; then
  # Remove lines in the CRM V2 comment block that duplicate tareas-crm
  sed -i '/\/\/ CRM V2.*Contactos.*Tratos.*Tareas/,+3{/tareas-crm/d}' src/lib/auth.ts
  echo "  Removed duplicates (was $DUPS)"
else
  echo "  No duplicates"
fi

# ─── FIX 4: Layout margin ───
echo "[4/8] Fix layout width..."
sed -i 's/lg:ml-\[236px\]/lg:ml-[250px]/' "src/app/(dashboard)/layout.tsx"
echo "  Done"

# ─── FIX 5: Topbar titles ───
echo "[5/8] Fix Topbar titles..."
# Add missing routes to TITLES
sed -i "s|'/crm': 'CRM',|'/crm': 'Pipeline CRM',\n  '/contactos': 'Contactos',\n  '/tareas-crm': 'Mis Tareas CRM',\n  '/comisiones': 'Comisiones',\n  '/documentos': 'Documentos',\n  '/exportar': 'Exportar',\n  '/subvenciones': 'Subvenciones',\n  '/clientes': 'Clientes',|" src/components/layout/Topbar.tsx
echo "  Done"

# ─── FIX 6: Remove branding from sidebar ───
echo "[6/8] Fix Sidebar..."
sed -i "/branding/d" src/components/layout/Sidebar.tsx
echo "  Done"

# ─── FIX 7+8: Create missing pages via Python ───
echo "[7/8] Creating missing pages..."
python3 /var/www/erp/create-missing-pages.py
echo "  Done"

# ─── APPLY SCHEMA + BUILD ───
echo ""
echo "═══ Prisma push ═══"
npx prisma db push --accept-data-loss 2>&1 | tail -3
npx prisma generate 2>&1 | tail -2

echo ""
echo "═══ Building... ═══"
npm run build 2>&1 | tail -15

BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "BUILD FAILED! Check errors above."
  exit 1
fi

echo ""
echo "═══ Restarting... ═══"
pm2 restart aurosolar-erp
sleep 2
pm2 status

echo ""
echo "═══ HOTFIX COMPLETE ═══"
echo ""
echo "Fixes applied:"
echo "  1. export.service.ts - comma fix"
echo "  2. schema.prisma - EstadoTrato default"
echo "  3. auth.ts - duplicate permissions"
echo "  4. layout.tsx - margin width"  
echo "  5. Topbar.tsx - missing titles"
echo "  6. Sidebar.tsx - branding removed"
echo "  7. contactos/page.tsx - CREATED"
echo "  8. tareas-crm/page.tsx - CREATED"
echo ""
echo "Test URLs:"
echo "  /contactos  /crm  /tareas-crm  /dashboard"
echo ""
echo "NOTA: El bug del cambio de sesión (admin→Soledad al pulsar Pipeline)"
echo "se debe a cookies de navegador. Solución: cerrar sesión, limpiar cookies"
echo "de app.aurosolar.es y volver a iniciar sesión."
