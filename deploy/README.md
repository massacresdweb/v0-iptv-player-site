# MASSTV Deployment

## Tek Komut Kurulum

\`\`\`bash
sudo ./deploy/install.sh masstv.xyz
\`\`\`

## Kurulum Sonrası

**Admin Giriş:**
- URL: https://masstv.xyz/admin/login
- Kullanıcı: massacresd
- Şifre: Massacresd2025@

**Yönetim:**
\`\`\`bash
pm2 status              # Durum
pm2 logs masstv         # Loglar
pm2 restart masstv      # Yeniden başlat
\`\`\`

## Sistem Gereksinimleri

- Ubuntu 20.04+
- 2GB+ RAM
- 20GB+ Disk
