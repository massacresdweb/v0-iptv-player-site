#!/bin/bash


echo "🚀 Running database migration..."

# Check if NEON_NEON_DATABASE_URL is set
if [ -z "$NEON_DATABASE_URL" ]; then
  echo "❌ Error: NEON_DATABASE_URL environment variable is not set"
  echo "💡 Loading from .env.local..."
  
  if [ -f .env.local ]; then
    export $(cat .env.local | grep NEON_DATABASE_URL | xargs)
  else
    echo "❌ Error: .env.local file not found"
    exit 1
  fi
fi

# Run migration using psql
if command -v psql &> /dev/null; then
  echo "✅ Using psql..."
  psql "$NEON_DATABASE_URL" -f scripts/001_add_xtream_support.sql
else
  echo "❌ psql not found, using sudo -u postgres..."
  sudo -u postgres psql -d masstv -f scripts/001_add_xtream_support.sql
fi

echo "✅ Migration completed!"
