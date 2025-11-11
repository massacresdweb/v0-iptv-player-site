#!/bin/bash

# MassTV Complete Installation Script for Single Server
# Ubuntu 22.04 LTS
# Installs: PostgreSQL, Redis, Nginx, SSL, Node.js, PM2, and MassTV Application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║                                           ║
║         MassTV Single Server Setup        ║
║     PostgreSQL + Redis + Nginx + App      ║
║                                           ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Get configuration
echo -e "${BLUE}[CONFIG] Collecting information...${NC}"
read -p "Domain name (e.g., masstv.example.com): " DOMAIN
read -p "Email for SSL certificate: " EMAIL
read -sp "PostgreSQL password: " DB_PASSWORD
echo ""
read -sp "Redis password: " REDIS_PASSWORD
echo ""
read -sp "Admin password for MassTV: " ADMIN_PASSWORD
echo ""

# Generate secrets
ENCRYPTION_KEY=$(openssl rand -hex 32)
MONITORING_API_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}✓ Configuration collected${NC}\n"

# Update system
echo -e "${BLUE}[1/12] Updating system...${NC}"
apt-get update && apt-get upgrade -y
echo -e "${GREEN}✓ System updated${NC}\n"

# Install dependencies
echo -e "${BLUE}[2/12] Installing system dependencies...${NC}"
apt-get install -y curl wget git build-essential software-properties-common \
    ufw nginx certbot python3-certbot-nginx postgresql postgresql-contrib redis-server
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Install Node.js 20
echo -e "${BLUE}[3/12] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 pnpm
echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}\n"

# Configure PostgreSQL
echo -e "${BLUE}[4/12] Configuring PostgreSQL database...${NC}"
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
-- Drop existing if needed
DROP DATABASE IF EXISTS masstv;
DROP USER IF EXISTS masstv;

-- Create fresh
CREATE DATABASE masstv;
CREATE USER masstv WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE masstv TO masstv;
ALTER DATABASE masstv OWNER TO masstv;
\c masstv
ALTER SCHEMA public OWNER TO masstv;
EOF

# Create database schema
sudo -u postgres psql -d masstv << 'SCHEMA'
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User Keys (for client access)
CREATE TABLE user_keys (
    id SERIAL PRIMARY KEY,
    key_code VARCHAR(255) UNIQUE NOT NULL,
    m3u_source_id INTEGER,
    expires_at TIMESTAMP,
    max_connections INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_keys_code ON user_keys(key_code);
CREATE INDEX idx_user_keys_expires ON user_keys(expires_at);

-- Admins
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- M3U Sources
CREATE TABLE m3u_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    encrypted_url TEXT NOT NULL,
    encryption_iv VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    live_channels INTEGER DEFAULT 0,
    movies INTEGER DEFAULT 0,
    series INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers (for load balancing)
CREATE TABLE servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    location VARCHAR(255),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active Sessions
CREATE TABLE active_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    key_code VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    hwid VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON active_sessions(session_token);
CREATE INDEX idx_sessions_key ON active_sessions(key_code);

-- Admin Sessions
CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);

-- Stream Logs
CREATE TABLE stream_logs (
    id SERIAL PRIMARY KEY,
    key_code VARCHAR(255),
    channel_name VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stream_logs_key ON stream_logs(key_code);
CREATE INDEX idx_stream_logs_started ON stream_logs(started_at);
SCHEMA

# Insert default admin with hashed password
sudo -u postgres psql -d masstv << EOF
INSERT INTO admins (username, password_hash) 
VALUES ('admin', crypt('$ADMIN_PASSWORD', gen_salt('bf')));
EOF

echo -e "${GREEN}✓ PostgreSQL configured with schema${NC}\n"

# Configure Redis
echo -e "${BLUE}[5/12] Configuring Redis cache...${NC}"
sed -i "s/# requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sed -i "s/^bind 127.0.0.1 ::1/bind 127.0.0.1/" /etc/redis/redis.conf
sed -i "s/# maxmemory .*/maxmemory 512mb/" /etc/redis/redis.conf
sed -i "s/# maxmemory-policy .*/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server
echo -e "${GREEN}✓ Redis configured${NC}\n"

# Setup application
echo -e "${BLUE}[6/12] Setting up MassTV application...${NC}"
APP_DIR="/var/www/masstv"
mkdir -p $APP_DIR

# Check if package.json exists in current directory
SCRIPT_DIR=$(pwd)
if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${YELLOW}Copying application files...${NC}"
    cp -r "$SCRIPT_DIR"/* $APP_DIR/
    cd $APP_DIR
else
    echo -e "${RED}✗ Application files not found!${NC}"
    echo -e "${YELLOW}Please run this script from the MassTV application directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Application files ready${NC}\n"

# Create environment file
echo -e "${BLUE}[7/12] Creating environment configuration...${NC}"
cat > $APP_DIR/.env.production.local << EOF
# Database
DATABASE_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv
NEON_DATABASE_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv
NEON_POSTGRES_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv

# Redis
UPSTASH_KV_REST_API_URL=redis://localhost:6379
UPSTASH_KV_REST_API_TOKEN=$REDIS_PASSWORD
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=$REDIS_PASSWORD

# App
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security
ENCRYPTION_KEY=$ENCRYPTION_KEY
MONITORING_API_KEY=$MONITORING_API_KEY
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Admin
DEFAULT_ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

echo -e "${GREEN}✓ Environment configured${NC}\n"

# Install dependencies
echo -e "${BLUE}[8/12] Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Build application
echo -e "${BLUE}[9/12] Building Next.js application...${NC}"
npm run build
echo -e "${GREEN}✓ Application built${NC}\n"

# Configure Nginx
echo -e "${BLUE}[10/12] Configuring Nginx reverse proxy...${NC}"
cat > /etc/nginx/sites-available/masstv << 'NGINX_CONFIG'
upstream masstv_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    # SSL certificates (will be configured by certbot)
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Streaming optimizations
    client_max_body_size 100M;
    client_body_buffer_size 128k;
    
    location / {
        proxy_pass http://masstv_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Streaming optimizations
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
    
    # Stream endpoint optimizations
    location /api/stream/ {
        proxy_pass http://masstv_backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        tcp_nodelay on;
    }
}
NGINX_CONFIG

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/masstv
ln -sf /etc/nginx/sites-available/masstv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx configured${NC}\n"

# Get SSL certificate
echo -e "${BLUE}[11/12] Obtaining SSL certificate...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
echo -e "${GREEN}✓ SSL certificate obtained${NC}\n"

# Configure firewall
echo -e "${BLUE}[12/12] Configuring UFW firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw delete allow 'Nginx HTTP' 2>/dev/null || true
echo -e "${GREEN}✓ Firewall configured${NC}\n"

# Start application with PM2
cd $APP_DIR
pm2 delete masstv 2>/dev/null || true
pm2 start npm --name "masstv" -- start
pm2 save
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                ║${NC}"
echo -e "${GREEN}║   ✓ MassTV Installation Complete!              ║${NC}"
echo -e "${GREEN}║                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Access URL:${NC}"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}🔐 Admin Login:${NC}"
echo -e "   Username: ${GREEN}admin${NC}"
echo -e "   Password: ${GREEN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo -e "   View logs:         ${YELLOW}pm2 logs masstv${NC}"
echo -e "   Restart app:       ${YELLOW}pm2 restart masstv${NC}"
echo -e "   Check status:      ${YELLOW}pm2 status${NC}"
echo -e "   App directory:     ${YELLOW}cd /var/www/masstv${NC}"
echo -e "   Database access:   ${YELLOW}sudo -u postgres psql -d masstv${NC}"
echo -e "   Redis CLI:         ${YELLOW}redis-cli -a $REDIS_PASSWORD${NC}"
echo ""
echo -e "${BLUE}🔒 Keep these credentials safe!${NC}"
echo ""
