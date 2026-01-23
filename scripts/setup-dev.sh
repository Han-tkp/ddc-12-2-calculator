#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f "prisma/dev.db" ]; then
  TS="$(date +"%Y%m%d-%H%M%S")"
  cp "prisma/dev.db" "prisma/dev.db.bak.$TS"
  echo "Backed up prisma/dev.db -> prisma/dev.db.bak.$TS"
fi

echo "Installing dependencies..."
npm ci

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed

echo "Done. Start dev server with: npm run dev"
