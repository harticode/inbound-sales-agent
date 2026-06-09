#!/bin/sh
set -e

echo "Running database migrations..."
npx tsx scripts/migrate.ts

echo "Seeding database (idempotent)..."
npx tsx scripts/seed.ts

echo "Starting Next.js server..."
exec "$@"
