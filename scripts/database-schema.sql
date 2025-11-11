-- MassTV Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User Keys table (for client access keys)
CREATE TABLE IF NOT EXISTS user_keys (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    max_connections INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_keys_key ON user_keys(key);
CREATE INDEX idx_user_keys_expires ON user_keys(expires_at);

-- Users table (for client keys)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    max_connections INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_key ON users(key);
CREATE INDEX idx_users_expires ON users(expires_at);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- M3U Sources table
CREATE TABLE IF NOT EXISTS m3u_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    last_sync TIMESTAMP,
    channel_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers table (for load balancing)
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    ssh_key TEXT,
    enabled BOOLEAN DEFAULT true,
    cpu_usage FLOAT DEFAULT 0,
    ram_usage FLOAT DEFAULT 0,
    network_usage FLOAT DEFAULT 0,
    latency FLOAT DEFAULT 0,
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for active connections)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Stream logs (for monitoring)
CREATE TABLE IF NOT EXISTS stream_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    channel_name VARCHAR(255),
    server_id INTEGER REFERENCES servers(id) ON DELETE SET NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    bytes_transferred BIGINT DEFAULT 0
);

CREATE INDEX idx_stream_logs_user ON stream_logs(user_id);
CREATE INDEX idx_stream_logs_started ON stream_logs(started_at);

-- Active sessions table for connection tracking
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    key_code VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    hwid VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_key ON active_sessions(key_code);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

-- Insert default admin (password will be set by install script)
INSERT INTO admins (username, password, email) 
VALUES ('admin', 'changeme', 'admin@masstv.local')
ON CONFLICT (username) DO NOTHING;
