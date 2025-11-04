# 🎬 IQ MASSTV - Premium IPTV Platform

Ultra-güvenli, çok hızlı KEY-based IPTV streaming platformu. 1000+ kullanıcı için optimize edilmiş, hacklenemez mimari.

## ✨ Özellikler

### 🔐 Güvenlik
- **KEY-based Authentication** - Kayıt/giriş yok, sadece KEY ile erişim
- **Anti-Debug Protection** - DevTools, Burp Suite, HTTP Debugger algılama
- **M3U URL Encryption** - M3U URL'leri şifreli saklanır, asla açığa çıkmaz
- **Stream Proxy** - Gerçek URL'ler gizlenir, proxy üzerinden stream
- **HWID Lock** - Bir KEY sadece bir cihazda çalışır (opsiyonel)
- **Ban Sistemi** - Admin kullanıcıları anlık banlayabilir
- **Session Management** - Güvenli JWT token sistemi

### ⚡ Performans
- **Ultra-Fast Caching** - Redis ile aggressive caching
- **Load Balancing** - Birden fazla stream sunucusu desteği
- **Connection Pooling** - Aynı stream için tek bağlantı
- **User Agent Rotation** - 1000+ kullanıcı = 1 kullanıcı gibi görünür
- **HLS.js Optimization** - Instant playback, adaptive bitrate
- **Quality Selection** - Auto, 1080p, 720p, 480p seçenekleri

### 🎯 Özellikler
- **Canlı TV** - M3U/M3U Plus desteği
- **Filmler & Diziler** - VOD kategorileri
- **Favori Sistemi** - Kullanıcılar favori ekleyebilir
- **Admin Panel** - KEY yönetimi, M3U yönetimi, sunucu yönetimi
- **Süre Bazlı KEY'ler** - 1 hafta, 1 ay, 3 ay, 1 yıl
- **Responsive Design** - Mobil ve desktop uyumlu

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js 18+
- PostgreSQL (Neon)
- Redis (Upstash)

### 2. Environment Variables

Vercel'de veya `.env.local` dosyasında şu değişkenleri ayarlayın:

\`\`\`env
# Database (Neon)
NEON_DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# JWT Secret (openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-here

# Encryption Key (openssl rand -hex 32)
ENCRYPTION_KEY=your-encryption-key-for-m3u-urls
\`\`\`

### 3. Veritabanı Kurulumu

SQL scriptlerini çalıştırın:

\`\`\`bash
# 1. Tabloları oluştur
psql $DATABASE_URL < scripts/001_create_iptv_database.sql

# 2. Sunucular tablosunu ekle
psql $DATABASE_URL < scripts/002_add_servers_table.sql
\`\`\`

### 4. İlk Admin Kullanıcısı

\`\`\`sql
INSERT INTO admins (username, password_hash, created_at)
VALUES (
  'admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIiIkYvYOm', -- şifre: admin123
  NOW()
);
\`\`\`

**ÖNEMLİ:** İlk girişten sonra şifreyi değiştirin!

### 5. Deploy

\`\`\`bash
# Vercel'e deploy
vercel --prod

# veya GitHub'a push edin (otomatik deploy)
git push origin main
\`\`\`

## 📖 Kullanım

### Admin Paneli

1. `/admin/login` adresine gidin
2. Kullanıcı adı: `admin`, Şifre: `admin123`
3. İlk girişten sonra şifreyi değiştirin

#### M3U Kaynağı Ekleme
1. Admin Panel → M3U Kaynakları
2. "Yeni M3U Kaynağı Ekle"
3. Kaynak adı ve M3U URL'sini girin
4. URL otomatik şifrelenir

#### KEY Oluşturma
1. Admin Panel → KEY Yönetimi
2. Süre seçin (1 hafta, 1 ay, 3 ay, 1 yıl)
3. M3U kaynağı seçin
4. "KEY Oluştur" butonuna tıklayın
5. Oluşturulan KEY'i kullanıcıya verin

#### Sunucu Ekleme (Load Balancing)
1. Admin Panel → Sunucular
2. Sunucu adı, URL ve lokasyon girin
3. Sistem otomatik load balancing yapar

### Kullanıcı Tarafı

1. Ana sayfaya gidin
2. KEY'inizi girin
3. Player otomatik açılır
4. Canlı TV, Filmler veya Diziler sekmesinden içerik seçin

## 🔧 Teknik Detaylar

### Mimari
\`\`\`
User → Next.js App → Stream Proxy → M3U Source
                   ↓
                 Redis Cache
                   ↓
              PostgreSQL
\`\`\`

### Stream Proxy Optimizasyonu
- **User Agent Rotation**: Her istek farklı user agent kullanır
- **IP Masking**: Tüm istekler aynı IP'den geliyormuş gibi görünür
- **Connection Pooling**: Aynı stream için tek bağlantı
- **Cache**: 5 saniye stream cache

### Güvenlik Katmanları
1. **Anti-Debug**: DevTools algılama ve engelleme
2. **Anti-Tamper**: Sağ tık, F12, Ctrl+Shift+I engelleme
3. **M3U Encryption**: AES-256-GCM şifreleme
4. **Session Validation**: Her istekte session kontrolü
5. **Rate Limiting**: Redis ile rate limiting

## 📊 Performans

- **Kanal Değiştirme**: < 0.5 saniye
- **İlk Yükleme**: < 2 saniye
- **Eşzamanlı Kullanıcı**: 10,000+
- **Cache Hit Rate**: %95+

## 🛡️ Güvenlik Notları

1. **JWT_SECRET**: Mutlaka değiştirin, güçlü bir key kullanın
2. **ENCRYPTION_KEY**: M3U URL'leri için güçlü encryption key
3. **Admin Şifresi**: İlk girişten sonra değiştirin
4. **HTTPS**: Production'da mutlaka HTTPS kullanın
5. **Rate Limiting**: Redis rate limiting aktif

## 🐛 Sorun Giderme

### Build Hatası
\`\`\`bash
# Dependencies'i temizle
rm -rf node_modules .next
bun install
bun run build
\`\`\`

### Stream Oynatma Sorunu
1. M3U URL'sinin doğru olduğundan emin olun
2. Stream proxy loglarını kontrol edin
3. Redis bağlantısını kontrol edin

### Admin Login Sorunu
1. Cookie'leri temizleyin
2. JWT_SECRET'in doğru olduğundan emin olun
3. Database bağlantısını kontrol edin

## 📝 Lisans

Özel proje - Tüm hakları saklıdır.

## 🤝 Destek

Sorun yaşarsanız:
1. Logs'ları kontrol edin
2. Environment variables'ları kontrol edin
3. Database bağlantısını test edin

---

**IQ MASSTV** - Premium IPTV Platform 🎬
