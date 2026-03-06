#!/bin/bash
# deploy.sh — Script único de deploy para aurosolar-erp
# Uso: bash deploy.sh ENV=staging
#      bash deploy.sh ENV=production
#
# Requisitos: ejecutar desde el directorio del proyecto

set -e  # Salir si cualquier comando falla

# ── Leer parámetro ENV ────────────────────────────────────────────────────────
ENV="${1#ENV=}"
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "❌ Uso: bash deploy.sh ENV=staging | ENV=production"
  exit 1
fi

if [[ "$ENV" == "staging" ]]; then
  APP_DIR="/var/www/erp-staging"
  PM2_NAME="erp-staging"
  PORT=4000
else
  APP_DIR="/var/www/erp"
  PM2_NAME="aurosolar-erp"
  PORT=3000
fi

echo "🚀 Deploy → $ENV ($APP_DIR)"
echo "────────────────────────────────────────"

# ── 1. Ir al directorio ───────────────────────────────────────────────────────
cd "$APP_DIR"

# ── 2. Actualizar repositorio ─────────────────────────────────────────────────
echo "📦 Actualizando repositorio..."
git pull

# ── 3. Instalar dependencias ──────────────────────────────────────────────────
echo "📦 Instalando dependencias..."
npm ci --prefer-offline

# ── 4. Build ──────────────────────────────────────────────────────────────────
echo "🔨 Compilando..."
npm run build

# ── 5. Restart PM2 ───────────────────────────────────────────────────────────
echo "♻️  Reiniciando proceso PM2 ($PM2_NAME)..."
pm2 restart "$PM2_NAME" --update-env

# ── 6. Verificar que levantó ──────────────────────────────────────────────────
sleep 3
STATUS=$(pm2 show "$PM2_NAME" | grep "status" | awk '{print $4}')
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health")

echo "────────────────────────────────────────"
echo "PM2 status : $STATUS"
echo "HTTP health: $HTTP"

if [[ "$HTTP" == "200" ]]; then
  echo "✅ Deploy completado correctamente"
else
  echo "❌ El servidor no responde — revisar logs: pm2 logs $PM2_NAME"
  exit 1
fi
