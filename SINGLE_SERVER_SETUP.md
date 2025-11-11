# MassTV Single Server Setup Guide

Bu rehber, MassTV platformunu tek bir Ubuntu 22.04 sunucusuna kurmanız için hazırlanmıştır.

## Sistem Gereksinimleri

- **OS:** Ubuntu 22.04 LTS (önerilir)
- **RAM:** Minimum 4GB, önerilen 8GB
- **CPU:** 2+ cores
- **Disk:** Minimum 20GB boş alan
- **Network:** Sabit IP adresi ve domain

## Kurulum Adımları

### 1. Sunucuya Bağlanın

\`\`\`bash
ssh root@your-server-ip
\`\`\`

### 2. Uygulama Dosyalarını Yükleyin

Tüm MassTV uygulama dosyalarını (app/, components/, lib/, package.json vb.) sunucuya yükleyin.

**Örnek (local'den sunucuya):**
\`\`\`bash
# Local makinenizden
rsync -avz --progress /path/to/masstv/ root@your-server:/root/masstv/
\`\`\`

veya

**Git ile:**
\`\`\`bash
# Sunucuda
git clone https://github.com/your-repo/masstv.git
cd masstv
\`\`\`

### 3. Setup Script'i Çalıştırın

\`\`\`bash
cd /root/masstv  # Uygulama dosyalarının olduğu dizin
chmod +x setup-masstv.sh
sudo ./setup-masstv.sh
\`\`\`

Script sizden şunları soracak:
- Domain adı (örn: masstv.example.com)
- SSL için email adresi
- PostgreSQL şifresi
- Redis şifresi
- Admin paneli şifresi

### 4. Kurulum Tamamlandı!

Script otomatik olarak:
- PostgreSQL ve veritabanı şemasını kuracak
- Redis cache sunucusunu yapılandıracak
- Nginx reverse proxy kuracak
- SSL sertifikası alacak (Let's Encrypt)
- Firewall (UFW) yapılandıracak
- PM2 ile uygulamayı başlatacak

## Kurulum Sonrası

### Uygulamaya Erişim

\`\`\`
https://your-domain.com
\`\`\`

### Admin Paneli

\`\`\`
https://your-domain.com/admin/login

Kullanıcı: admin
Şifre: (kurulumda girdiğiniz şifre)
\`\`\`

## Yönetim Komutları

### Uygulama Yönetimi

\`\`\`bash
# Logları görüntüle
pm2 logs masstv

# Uygulamayı yeniden başlat
pm2 restart masstv

# Durum kontrolü
pm2 status

# Uygulamayı durdur
pm2 stop masstv

# Uygulamayı başlat
pm2 start masstv
\`\`\`

### Database Yönetimi

\`\`\`bash
# PostgreSQL'e bağlan
sudo -u postgres psql -d masstv

# Backup al
sudo -u postgres pg_dump masstv > backup.sql

# Backup'tan geri yükle
sudo -u postgres psql masstv < backup.sql
\`\`\`

### Redis Yönetimi

\`\`\`bash
# Redis CLI
redis-cli -a YOUR_REDIS_PASSWORD

# Cache temizle
redis-cli -a YOUR_REDIS_PASSWORD FLUSHALL
\`\`\`

### Nginx Yönetimi

\`\`\`bash
# Nginx testi
nginx -t

# Nginx yeniden yükle
systemctl reload nginx

# Nginx yeniden başlat
systemctl restart nginx

# Logları görüntüle
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
\`\`\`

### SSL Sertifika Yenileme

\`\`\`bash
# Certbot otomatik yeniler, manuel yenilemek için:
certbot renew

# Test yenileme
certbot renew --dry-run
\`\`\`

## Troubleshooting

### Uygulama çalışmıyor

\`\`\`bash
# Logları kontrol et
pm2 logs masstv

# Uygulamayı yeniden başlat
pm2 restart masstv

# Node.js process'i kontrol et
ps aux | grep node
\`\`\`

### Database bağlantı sorunu

\`\`\`bash
# PostgreSQL durumunu kontrol et
systemctl status postgresql

# PostgreSQL'i yeniden başlat
systemctl restart postgresql

# Database bağlantısını test et
sudo -u postgres psql -d masstv -c "SELECT 1;"
\`\`\`

### Redis bağlantı sorunu

\`\`\`bash
# Redis durumunu kontrol et
systemctl status redis-server

# Redis'i yeniden başlat
systemctl restart redis-server

# Redis bağlantısını test et
redis-cli -a YOUR_REDIS_PASSWORD ping
\`\`\`

### Nginx sorunu

\`\`\`bash
# Nginx durumunu kontrol et
systemctl status nginx

# Nginx config testi
nginx -t

# Hata loglarını kontrol et
tail -f /var/log/nginx/error.log
\`\`\`

### Port kontrolü

\`\`\`bash
# Açık portları kontrol et
netstat -tulpn | grep LISTEN

# Firewall durumunu kontrol et
ufw status
\`\`\`

## Performans İyileştirmeleri

### PostgreSQL Tuning

\`\`\`bash
# /etc/postgresql/14/main/postgresql.conf düzenle
sudo nano /etc/postgresql/14/main/postgresql.conf

# Önerilen ayarlar (8GB RAM için):
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
\`\`\`

### Redis Tuning

\`\`\`bash
# /etc/redis/redis.conf düzenle
sudo nano /etc/redis/redis.conf

# Önerilen ayarlar:
maxmemory 1gb
maxmemory-policy allkeys-lru
\`\`\`

## Güvenlik Önerileri

1. **SSH Key Authentication:** Şifre ile giriş yerine SSH key kullanın
2. **Firewall:** Sadece gerekli portları açık tutun
3. **Fail2ban:** Brute force saldırılara karşı koruma kurun
4. **Regular Updates:** Sistemi düzenli güncelleyin
5. **Backup:** Günlük otomatik backup alın

## Backup Script Örneği

\`\`\`bash
#!/bin/bash
# /root/backup-masstv.sh

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump masstv > "$BACKUP_DIR/db_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C /var/www masstv

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
\`\`\`

Cronjob ekle (her gün 2:00'de):
\`\`\`bash
crontab -e
0 2 * * * /root/backup-masstv.sh >> /var/log/masstv-backup.log 2>&1
\`\`\`

## Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. System resources'u kontrol edin (CPU, RAM, Disk)
3. Network bağlantısını test edin
4. Documentation'ı inceleyin
