-- MASSTV - Complete Database Setup
-- Run this script once to set up everything

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- M3U sources (encrypted URLs)
CREATE TABLE IF NOT EXISTS m3u_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  encrypted_url TEXT NOT NULL,
  encryption_iv VARCHAR(32) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  live_channels INTEGER DEFAULT 0,
  movies INTEGER DEFAULT 0,
  series INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers for load balancing
CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  location VARCHAR(100) DEFAULT 'Unknown',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User keys
CREATE TABLE IF NOT EXISTS user_keys (
  id SERIAL PRIMARY KEY,
  key_code VARCHAR(50) UNIQUE NOT NULL,
  m3u_source_id INTEGER REFERENCES m3u_sources(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  max_connections INTEGER DEFAULT 1,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Active sessions (for connection limiting)
CREATE TABLE IF NOT EXISTS active_sessions (
  id SERIAL PRIMARY KEY,
  key_code VARCHAR(50) REFERENCES user_keys(key_code) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  hwid VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stream logs (minimal for performance)
CREATE TABLE IF NOT EXISTS stream_logs (
  id SERIAL PRIMARY KEY,
  key_code VARCHAR(50),
  channel_name VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ultra-fast performance
CREATE INDEX IF NOT EXISTS idx_user_keys_code ON user_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_user_keys_active ON user_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_key ON active_sessions(key_code);
CREATE INDEX IF NOT EXISTS idx_m3u_sources_active ON m3u_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_servers_active ON servers(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

-- Insert admin user: massacresd / Massacresd2025@
INSERT INTO admins (username, password_hash) 
VALUES ('massacresd', '$2a$10$5P8paKWdlhncm2hM92om9.Tz0R/1S/CN/QpP4m/t5.xDbrzmEa5BK')
ON CONFLICT (username) DO NOTHING;
