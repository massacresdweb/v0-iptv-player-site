-- Add Xtream Codes support to m3u_sources table

-- Add columns for Xtream Codes credentials
ALTER TABLE m3u_sources 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'm3u',
ADD COLUMN IF NOT EXISTS xtream_server TEXT,
ADD COLUMN IF NOT EXISTS xtream_username TEXT,
ADD COLUMN IF NOT EXISTS xtream_password TEXT,
ADD COLUMN IF NOT EXISTS xtream_port INTEGER DEFAULT 80;

-- Add index for source type
CREATE INDEX IF NOT EXISTS idx_m3u_sources_type ON m3u_sources(source_type);

-- Update existing records to be 'm3u' type
UPDATE m3u_sources SET source_type = 'm3u' WHERE source_type IS NULL;
