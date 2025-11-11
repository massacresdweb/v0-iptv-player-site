# MassTV Quick Installation Guide

## Prerequisites
- Ubuntu 22.04 LTS server
- Root or sudo access
- Domain name pointing to your server's IP
- Minimum 2GB RAM, 20GB storage

## Installation Steps

### 1. Prepare Application Files
\`\`\`bash
# Upload all your MassTV application files to the server
# Make sure package.json, app/, components/, lib/ folders are present
\`\`\`

### 2. Run Installation Script
\`\`\`bash
# Download and run the installer
chmod +x install-masstv.sh
sudo ./install-masstv.sh
\`\`\`

### 3. Follow Prompts
The installer will ask for:
- Domain name (e.g., masstv.example.com)
- Email for SSL certificate
- PostgreSQL password
- Redis password
- Admin panel password

### 4. Wait for Installation
Installation takes 5-10 minutes and includes:
- System updates
- PostgreSQL database setup
- Redis cache setup
- Node.js 20 installation
- Application build
- Nginx reverse proxy
- SSL certificate (Let's Encrypt)
- UFW firewall configuration
- PM2 process manager

### 5. Access Your Platform
After installation completes:
- Admin Panel: `https://yourdomain.com/admin`
- User Login: `https://yourdomain.com/login`
- Default credentials will be displayed

## Post-Installation

### Add M3U Source
1. Login to admin panel
2. Go to "M3U Sources"
3. Add your IPTV provider URL
4. Enable the source

### Create User Keys
1. Go to "User Keys" in admin panel
2. Click "Add New Key"
3. Set expiration date and max connections
4. Share the key with users

### Monitor System
\`\`\`bash
pm2 status              # Check application status
pm2 logs masstv         # View application logs
sudo systemctl status nginx       # Check Nginx
sudo systemctl status postgresql  # Check PostgreSQL
sudo systemctl status redis       # Check Redis
\`\`\`

### Useful Commands
\`\`\`bash
# Restart application
pm2 restart masstv

# View real-time logs
pm2 logs masstv --lines 100

# Database access
sudo -u postgres psql -d masstv

# Redis access
redis-cli -a YOUR_REDIS_PASSWORD

# Check firewall
sudo ufw status

# Renew SSL certificate (automatic, but manual command)
sudo certbot renew
\`\`\`

## Troubleshooting

### Application won't start
\`\`\`bash
cd /var/www/masstv
pm2 logs masstv
\`\`\`

### Database connection error
\`\`\`bash
sudo systemctl status postgresql
sudo -u postgres psql -d masstv -c "\l"
\`\`\`

### Redis connection error
\`\`\`bash
sudo systemctl status redis
redis-cli -a YOUR_PASSWORD ping
\`\`\`

### Nginx error
\`\`\`bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
\`\`\`

## Security Notes

- All passwords are auto-generated and secure
- Firewall blocks all ports except 22 (SSH), 80 (HTTP), 443 (HTTPS)
- SSL certificate auto-renews every 90 days
- Database and Redis are localhost-only
- M3U URLs are encrypted and proxied

## Performance Optimization

The system is pre-optimized with:
- Redis caching (1000 users = 1 stream load)
- Load balancer for multiple servers
- Ultra-fast HLS.js player
- Aggressive buffering and retry logic
- Hardware acceleration enabled

## Support

For issues or questions, check:
- Application logs: `pm2 logs masstv`
- System logs: `journalctl -xe`
- Nginx logs: `/var/log/nginx/`
