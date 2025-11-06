#!/bin/bash

# Xtream Codes support migration script

echo "🔄 Running database migration..."

# SQL komutlarını çalıştır
PGPASSWORD="${NEON_POSTGRES_PASSWORD}" psql \
  -h "${NEON_PGHOST}" \
  -U "${NEON_POSTGRES_USER}" \
  -d "${NEON_POSTGRES_DATABASE}" \
  -c "
-- Xtream Codes kolonlarını ekle
ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(10) DEFAULT 'm3u' CHECK (source_type IN ('m3u', 'xtream'));

ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS xtream_server VARCHAR(500);

ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS xtream_username VARCHAR(255);

ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS xtream_password VARCHAR(255);

ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS xtream_port INTEGER DEFAULT 80;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_m3u_sources_type ON m3u_sources(source_type);
"

if [ $? -eq 0 ]; then
  echo "✅ Database migration completed successfully!"
else
  echo "❌ Migration failed!"
  exit 1
fi
