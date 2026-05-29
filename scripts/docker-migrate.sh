#!/bin/sh
set -eu

echo "[migrate] Running prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "[migrate] migrate deploy succeeded"
  exit 0
fi

echo "[migrate] migrate deploy failed (legacy migration chain not bootstrapable)."
echo "[migrate] Falling back to prisma db push for Docker runtime sync..."
npx prisma db push --accept-data-loss

echo "[migrate] db push completed"
