-- Ultra-secure IPTV Database Schema
-- Optimized for 10K+ concurrent users

-- Users table with security features
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  max_devices INTEGER DEFAULT 1,
  subscription_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  ip_whitelist TEXT[], -- Array of allowed IPs
  hwid VARCHAR(255), -- Hardware ID lock
  api_key VARCHAR(64) UNIQUE NOT NULL -- Secure API key for each user
);

-- Sessions table for token management
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers table for load balancing
CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  priority INTEGER DEFAULT 1,
  max_connections INTEGER DEFAULT 1000,
  current_connections INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER DEFAULT 0,
  last_health_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  stream_url VARCHAR(1000) NOT NULL,
  category VARCHAR(100),
  language VARCHAR(50) DEFAULT 'tr',
  is_active BOOLEAN DEFAULT true,
  quality VARCHAR(20) DEFAULT 'HD' CHECK (quality IN ('SD', 'HD', 'FHD', '4K', '8K')),
  epg_id VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);

-- Activity logs for security monitoring
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_servers_is_active ON servers(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Insert default admin user (password: Admin123!)
INSERT INTO users (username, email, password_hash, role, api_key) 
VALUES (
  'admin',
  'admin@iptv.local',
  '$2a$10$rQZ9vXqKX8YxKX8YxKX8YeO7qZ9vXqKX8YxKX8YxKX8YeO7qZ9vXq', -- Admin123!
  'admin',
  encode(gen_random_bytes(32), 'hex')
) ON CONFLICT (email) DO NOTHING;

-- Insert sample servers
INSERT INTO servers (name, url, priority, max_connections) VALUES
  ('Primary Server TR', 'https://cdn1.iptv.example.com', 1, 5000),
  ('Secondary Server EU', 'https://cdn2.iptv.example.com', 2, 3000),
  ('Backup Server US', 'https://cdn3.iptv.example.com', 3, 2000)
ON CONFLICT DO NOTHING;
