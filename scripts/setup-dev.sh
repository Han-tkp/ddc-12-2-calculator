#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing dependencies..."
npm install

echo "Done. Make sure you have configured your .env file with Supabase credentials."
echo "Start dev server with: npm run dev"
