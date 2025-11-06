#!/bin/bash

# MASSTV Deployment Script
# Tek komutla tüm güncellemeleri uygular

set -e  # Hata durumunda dur

echo "🚀 MASSTV Deployment Başlıyor..."

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Dizin kontrolü
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Hata: package.json bulunamadı. Doğru dizinde olduğunuzdan emin olun.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Bağımlılıklar yükleniyor...${NC}"
npm install

echo -e "${YELLOW}🔨 Build alınıyor...${NC}"
npm run build

echo -e "${YELLOW}🔄 PM2 yeniden başlatılıyor...${NC}"
pm2 delete all 2>/dev/null || true
pm2 kill

echo -e "${YELLOW}🚀 Uygulama başlatılıyor...${NC}"
pm2 start npm --name "masstv" -- start

echo -e "${YELLOW}💾 PM2 konfigürasyonu kaydediliyor...${NC}"
pm2 save

echo -e "${YELLOW}📊 Durum kontrol ediliyor...${NC}"
pm2 status

echo -e "${GREEN}✅ Deployment tamamlandı!${NC}"
echo -e "${GREEN}📝 Logları görmek için: pm2 logs masstv${NC}"
echo -e "${GREEN}🌐 Uygulama çalışıyor: http://$(hostname -I | awk '{print $1}'):3000${NC}"
