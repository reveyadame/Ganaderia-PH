#!/bin/bash
set -e

echo "=== Deploy Ganadería PH ==="
echo "Fecha: $(date)"

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Instalar dependencias (pnpm debe estar instalado en el servidor)
echo "--- Instalando dependencias..."
pnpm install --frozen-lockfile

# Generar cliente Prisma
echo "--- Generando Prisma client..."
pnpm db:generate

# Construir imágenes Docker
echo "--- Construyendo imágenes..."
docker compose -f docker-compose.prod.yml build --no-cache

# Levantar servicios (postgres y redis primero)
echo "--- Levantando base de datos y redis..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# Esperar a que postgres esté listo
echo "--- Esperando a PostgreSQL..."
sleep 5

# Ejecutar migraciones
echo "--- Ejecutando migraciones..."
docker compose -f docker-compose.prod.yml run --rm api sh -c "pnpm db:migrate:prod"

# Levantar todos los servicios
echo "--- Levantando todos los servicios..."
docker compose -f docker-compose.prod.yml up -d

# Limpiar imágenes antiguas
echo "--- Limpiando imágenes antiguas..."
docker image prune -f

echo "=== Deploy completado ==="
