#!/bin/bash

# MASSTV - Ubuntu Server Kurulum Scripti
# Tek komutla PostgreSQL, Redis, Nginx, PM2, SSL kurulumu

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Domain kontrolü
if [ -z "$1" ]; then
    echo -e "${RED}Hata: Domain belirtilmedi!${NC}"
    echo "Kullanım: ./install.sh masstv.xyz"
    exit 1
fi

DOMAIN=$1
APP_DIR="/var/www/v0-iptv-player-site"

echo -e "${GREEN}=== MASSTV Kurulum Başlıyor ===${NC}"
echo "Domain: $DOMAIN"
echo "Dizin: $APP_DIR"

# Sistem güncellemesi
echo -e "${YELLOW}[1/10] Sistem güncelleniyor...${NC}"
apt-get update
apt-get upgrade -y

# Gerekli paketler
echo -e "${YELLOW}[2/10] Gerekli paketler kuruluyor...${NC}"
apt-get install -y curl wget git unzip build-essential

# Eski Node.js kaldır
echo -e "${YELLOW}[3/10] Eski Node.js kaldırılıyor...${NC}"
apt-get remove --purge -y nodejs libnode-dev npm || true
apt-get autoremove -y

# Node.js 20 LTS kur
echo -e "${YELLOW}[4/10] Node.js 20 LTS kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL kur
echo -e "${YELLOW}[5/10] PostgreSQL kuruluyor...${NC}"
apt-get install -y postgresql postgresql-contrib

# PostgreSQL başlat
systemctl start postgresql
systemctl enable postgresql

# Database oluştur
echo -e "${YELLOW}[6/10] Database oluşturuluyor...${NC}"
sudo -u postgres psql -c "CREATE DATABASE masstv;" || echo "Database zaten var"
sudo -u postgres psql -c "CREATE USER masstv WITH PASSWORD 'masstv2025';" || echo "User zaten var"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE masstv TO masstv;"
sudo -u postgres psql -c "ALTER DATABASE masstv OWNER TO masstv;"

# Database schema
sudo -u postgres psql -d masstv -f "$APP_DIR/scripts/000_setup_database.sql" || echo "Schema zaten var"

# Redis kur
echo -e "${YELLOW}[7/10] Redis kuruluyor...${NC}"
apt-get install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Environment variables
echo -e "${YELLOW}[8/10] Environment variables oluşturuluyor...${NC}"
cat > "$APP_DIR/.env.local" <<EOF
# Domain
DOMAIN=$DOMAIN
NEXT_PUBLIC_DOMAIN=https://$DOMAIN

# Database (Local PostgreSQL)
NEON_DATABASE_URL=postgresql://masstv:masstv2025@localhost:5432/masstv

# Redis (Local)
REDIS_URL=redis://localhost:6379

# Auto-generated secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
STREAM_SECRET_KEY=$(openssl rand -base64 32)

# Port
PORT=3000
EOF

# Dependencies kur
echo -e "${YELLOW}[9/10] Dependencies kuruluyor...${NC}"
cd "$APP_DIR"
npm install

# Build
echo -e "${YELLOW}[10/10] Uygulama build ediliyor...${NC}"
npm run build

# PM2 kur
echo -e "${YELLOW}[11/12] PM2 kuruluyor...${NC}"
npm install -g pm2

# PM2 ile başlat
pm2 delete masstv || true
pm2 start npm --name "masstv" -- start
pm2 save
pm2 startup

# Nginx kur
echo -e "${YELLOW}[12/12] Nginx kuruluyor...${NC}"
apt-get install -y nginx

# Nginx config
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
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/masstv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# UFW Firewall
echo -e "${YELLOW}[13/13] UFW Firewall yapılandırılıyor...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# SSL (Let's Encrypt)
echo -e "${YELLOW}SSL sertifikası kuruluyor...${NC}"
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo "SSL kurulumu atlandı"

echo -e "${GREEN}=== KURULUM TAMAMLANDI ===${NC}"
echo ""
echo "Site: https://$DOMAIN"
echo "Admin: https://$DOMAIN/admin/login"
echo "Kullanıcı: massacresd"
echo "Şifre: Massacresd2025@"
echo ""
echo "Yönetim Komutları:"
echo "  pm2 status          - Durum kontrol"
echo "  pm2 logs masstv     - Logları görüntüle"
echo "  pm2 restart masstv  - Yeniden başlat"
echo "  pm2 stop masstv     - Durdur"
