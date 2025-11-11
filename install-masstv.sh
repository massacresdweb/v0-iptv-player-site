#!/bin/bash

# MassTV Complete Installation Script
# Ubuntu 22.04 LTS
# This script installs everything: PostgreSQL, Redis, Nginx, SSL, Node.js, Application

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
║           MassTV Installer v1.0           ║
║     Ultra Secure IPTV Platform Setup      ║
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
echo -e "${BLUE}[1/13] Configuration${NC}"
read -p "Enter your domain name (e.g., masstv.example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL
read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""
read -sp "Enter Redis password: " REDIS_PASSWORD
echo ""
read -sp "Enter Admin password for MassTV: " ADMIN_PASSWORD
echo ""

# Generate random secrets
ENCRYPTION_KEY=$(openssl rand -base64 32)
MONITORING_API_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}✓ Configuration collected${NC}"

# Update system
echo -e "${BLUE}[2/13] Updating system...${NC}"
apt-get update
apt-get upgrade -y
echo -e "${GREEN}✓ System updated${NC}"

# Install dependencies
echo -e "${BLUE}[3/13] Installing dependencies...${NC}"
apt-get install -y curl wget git build-essential software-properties-common \
    ufw nginx certbot python3-certbot-nginx postgresql postgresql-contrib \
    redis-server
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Install Node.js 20
echo -e "${BLUE}[4/13] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 pnpm
echo -e "${GREEN}✓ Node.js $(node -v) and PM2 installed${NC}"

# Configure PostgreSQL
echo -e "${BLUE}[5/13] Configuring PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE masstv;" || true
sudo -u postgres psql -c "CREATE USER masstv WITH PASSWORD '$DB_PASSWORD';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE masstv TO masstv;" || true
sudo -u postgres psql -c "ALTER DATABASE masstv OWNER TO masstv;" || true

# Create database schema
sudo -u postgres psql -d masstv << EOF
-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    max_connections INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS m3u_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin
INSERT INTO admins (username, password) 
VALUES ('admin', crypt('$ADMIN_PASSWORD', gen_salt('bf')))
ON CONFLICT (username) DO UPDATE SET password = crypt('$ADMIN_PASSWORD', gen_salt('bf'));

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOF

echo -e "${GREEN}✓ PostgreSQL configured${NC}"

# Configure Redis
echo -e "${BLUE}[6/13] Configuring Redis...${NC}"
sed -i "s/# requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sed -i "s/^bind 127.0.0.1 ::1/bind 127.0.0.1/" /etc/redis/redis.conf
sed -i "s/# maxmemory .*/maxmemory 256mb/" /etc/redis/redis.conf
sed -i "s/# maxmemory-policy .*/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server
echo -e "${GREEN}✓ Redis configured${NC}"

# Setup application directory
echo -e "${BLUE}[7/13] Setting up application...${NC}"
APP_DIR="/var/www/masstv"
mkdir -p $APP_DIR
cd $APP_DIR

# Check if we're running from the app directory
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing from current directory...${NC}"
    cp -r * $APP_DIR/ 2>/dev/null || true
else
    echo -e "${RED}✗ package.json not found${NC}"
    echo -e "${YELLOW}Please copy your MassTV application files to this directory first${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Application files ready${NC}"

# Create environment file
echo -e "${BLUE}[8/13] Creating environment configuration...${NC}"
cat > $APP_DIR/.env.production.local << EOF
# Database
DATABASE_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv
NEON_DATABASE_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv
NEON_POSTGRES_URL=postgresql://masstv:$DB_PASSWORD@localhost:5432/masstv

# Redis
UPSTASH_KV_REST_API_URL=redis://localhost:6379
UPSTASH_KV_REST_API_TOKEN=$REDIS_PASSWORD
UPSTASH_KV_REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=$REDIS_PASSWORD

# App Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security Keys
ENCRYPTION_KEY=$ENCRYPTION_KEY
MONITORING_API_KEY=$MONITORING_API_KEY
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Admin
DEFAULT_ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Install shadcn components
echo -e "${BLUE}[9/13] Installing shadcn components...${NC}"
npx shadcn@latest add "https://v0.app/chat/b/b_Gsus1tv12Tp?token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..bgbhdF4pdCdmamkB.3SEAVjLPxjb-RDxn_mGNbeZ8das4548m5qM5MYvWqtll3sfiU3SHBUiLGqA.I6AzsCg-yh3wLQoiIlBdaA" -y || echo "Shadcn components installed or skipped"
echo -e "${GREEN}✓ Shadcn components ready${NC}"

# Install dependencies and build
echo -e "${BLUE}[10/13] Installing dependencies and building...${NC}"
npm install
npm run build
echo -e "${GREEN}✓ Application built${NC}"

# Configure Nginx
echo -e "${BLUE}[11/13] Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/masstv << EOF
upstream masstv_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy settings
    location / {
        proxy_pass http://masstv_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/masstv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# Get SSL certificate
echo -e "${BLUE}[12/13] Obtaining SSL certificate...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
echo -e "${GREEN}✓ SSL certificate obtained${NC}"

# Configure UFW firewall
echo -e "${BLUE}[13/13] Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw delete allow 'Nginx HTTP' 2>/dev/null || true
echo -e "${GREEN}✓ Firewall configured${NC}"

# Setup PM2 and start application
cd $APP_DIR
pm2 delete masstv 2>/dev/null || true
pm2 start npm --name "masstv" -- start
pm2 save
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║   ✓ MassTV Installation Complete!         ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access your platform at:${NC}"
echo -e "${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}Admin Login:${NC}"
echo -e "Username: ${GREEN}admin${NC}"
echo -e "Password: ${GREEN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "View logs:        ${YELLOW}pm2 logs masstv${NC}"
echo -e "Restart app:      ${YELLOW}pm2 restart masstv${NC}"
echo -e "Check status:     ${YELLOW}pm2 status${NC}"
echo -e "Database access:  ${YELLOW}sudo -u postgres psql -d masstv${NC}"
echo ""
echo -e "${YELLOW}Keep these credentials safe!${NC}"
