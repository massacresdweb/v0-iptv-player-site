#!/bin/bash

# This installs PostgreSQL, Redis, Nginx, and MassTV application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MassTV Single Server Setup v2.0     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (sudo)${NC}" 
   exit 1
fi

# Get configuration
read -p "Enter domain name (e.g., masstv.example.com): " DOMAIN
read -p "Enter email for SSL certificate: " EMAIL
read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo
read -sp "Enter Redis password: " REDIS_PASSWORD
echo
read -sp "Enter admin password for MassTV: " ADMIN_PASSWORD
echo

APP_DIR="/var/www/masstv"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: System Update
echo -e "\n${BLUE}[1/12] Updating system...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# Step 2: Install Node.js 20
echo -e "${BLUE}[2/12] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs

# Step 3: Install PostgreSQL
echo -e "${BLUE}[3/12] Installing PostgreSQL...${NC}"
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE masstv;"

# Step 4: Install Redis
echo -e "${BLUE}[4/12] Installing Redis...${NC}"
apt-get install -y redis-server
sed -i "s/^# requirepass.*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sed -i "s/^bind 127.0.0.1/bind 127.0.0.1/" /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# Step 5: Install Nginx
echo -e "${BLUE}[5/12] Installing Nginx...${NC}"
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Step 6: Install Certbot for SSL
echo -e "${BLUE}[6/12] Installing Certbot for SSL...${NC}"
apt-get install -y certbot python3-certbot-nginx

# Step 7: Setup Application Directory
echo -e "${BLUE}[7/12] Setting up application...${NC}"
mkdir -p $APP_DIR

# Copy application files
if [ -d "$SCRIPT_DIR/app" ]; then
    cp -r "$SCRIPT_DIR/"* "$APP_DIR/"
else
    echo -e "${YELLOW}Application files not found in expected location${NC}"
    echo -e "${YELLOW}Please ensure all application files are in the same directory as this script${NC}"
    exit 1
fi

cd $APP_DIR

# Step 8: Install Dependencies
echo -e "${BLUE}[8/12] Installing dependencies...${NC}"
npm install --production

# Step 9: Create Environment Variables
echo -e "${BLUE}[9/12] Creating environment configuration...${NC}"
cat > .env.production.local <<EOF
# Database
LOCAL_DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/masstv
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/masstv

# Redis
LOCAL_REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379
REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379

# App Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security Keys (auto-generated)
ENCRYPTION_KEY=$(openssl rand -base64 32)
MONITORING_API_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Admin
DEFAULT_ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

# Step 10: Initialize Database
echo -e "${BLUE}[10/12] Initializing database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d masstv -f scripts/database-schema.sql

# Create default admin user
HASHED_PASSWORD=$(node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10))")
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d masstv -c "
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '$HASHED_PASSWORD') 
ON CONFLICT (username) DO NOTHING;
"

# Step 11: Build Application
echo -e "${BLUE}[11/12] Building application...${NC}"
npm run build

# Step 12: Setup PM2 and Nginx
echo -e "${BLUE}[12/12] Configuring services...${NC}"

# Install PM2
npm install -g pm2

# Create PM2 ecosystem
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'masstv',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash

# Configure Nginx
cat > /etc/nginx/sites-available/masstv <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Streaming optimizations
        proxy_buffering off;
        proxy_request_buffering off;
        tcp_nodelay on;
        tcp_nopush on;
    }
}
EOF

ln -sf /etc/nginx/sites-available/masstv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Setup SSL
echo -e "${BLUE}Setting up SSL certificate...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Setup Firewall
echo -e "${BLUE}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Final status check
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     MassTV Setup Complete! ✓          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Access your MassTV platform at:${NC}"
echo -e "${GREEN}https://$DOMAIN${NC}"
echo -e "\n${BLUE}Admin Login:${NC}"
echo -e "URL: ${GREEN}https://$DOMAIN/admin/login${NC}"
echo -e "Username: ${GREEN}admin${NC}"
echo -e "Password: ${GREEN}[your admin password]${NC}"
echo -e "\n${BLUE}Services Status:${NC}"
systemctl status postgresql --no-pager | grep Active
systemctl status redis-server --no-pager | grep Active
systemctl status nginx --no-pager | grep Active
pm2 list
echo -e "\n${YELLOW}To manage the application:${NC}"
echo -e "  pm2 restart masstv    - Restart app"
echo -e "  pm2 logs masstv       - View logs"
echo -e "  pm2 monit             - Monitor resources"
