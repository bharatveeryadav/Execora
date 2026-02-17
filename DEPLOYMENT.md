# 🚀 Execora Production Deployment Guide

Complete guide for deploying Execora to production.

## 📋 Pre-Deployment Checklist

- [ ] OpenAI API key with billing enabled
- [ ] VPS with 4GB+ RAM, 2+ CPU cores
- [ ] Domain name (optional but recommended)
- [ ] SSL certificate (Let's Encrypt)
- [ ] WhatsApp Business API credentials (optional)
- [ ] Backup strategy planned

## 🖥️ Server Requirements

### Minimum Specifications
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 22.04 LTS (recommended)
- **Network**: 100 Mbps+

### Recommended for Production
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Bandwidth**: Unmetered or 1TB+

## 🔧 Server Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install basic tools
sudo apt install -y git curl wget htop
```

### 2. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (be careful!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 3. Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/execora
sudo chown $USER:$USER /opt/execora
cd /opt/execora

# Clone repo
git clone <repository-url> .
```

## 🔐 Environment Configuration

### 1. Create Production .env

```bash
cp .env.example .env
nano .env
```

### 2. Required Environment Variables

```env
# Database (use strong password!)
DATABASE_URL="postgresql://execora:STRONG_PASSWORD_HERE@postgres:5432/execora?schema=public"

# Redis (use password in production!)
REDIS_HOST="redis"
REDIS_PORT=6379
REDIS_PASSWORD="STRONG_PASSWORD_HERE"

# MinIO (change defaults!)
MINIO_ENDPOINT="minio"
MINIO_PORT=9000
MINIO_ACCESS_KEY="CHANGE_THIS"
MINIO_SECRET_KEY="CHANGE_THIS_TO_LONG_RANDOM_STRING"
MINIO_BUCKET="execora"
MINIO_USE_SSL=false

# OpenAI (required!)
OPENAI_API_KEY="sk-your-actual-key-here"
OPENAI_MODEL="gpt-4-turbo-preview"

# WhatsApp (required for reminders)
WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_long_lived_token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_random_string_here"
WHATSAPP_API_VERSION="v18.0"

# Server
PORT=3000
HOST="0.0.0.0"
NODE_ENV="production"

# Timezone
TZ="Asia/Kolkata"
```

### 3. Update docker-compose.yml for Production

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: execora-postgres
    environment:
      POSTGRES_USER: execora
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: execora
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - execora-network

  redis:
    image: redis:7-alpine
    container_name: execora-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - execora-network

  minio:
    image: minio/minio:latest
    container_name: execora-minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped
    networks:
      - execora-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: execora-app
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"  # Bind to localhost only
    depends_on:
      - postgres
      - redis
      - minio
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - execora-network

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: execora-worker
    env_file: .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - execora-network

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  execora-network:
    driver: bridge
```

## 🚀 Deployment Steps

### 1. Build and Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Initialize Database

```bash
# Push schema
docker-compose exec app npx prisma db push

# Seed with sample data (optional)
docker-compose exec app npx prisma db seed
```

### 3. Verify Services

```bash
# Check app health
curl http://localhost:3000/health

# Check WebSocket
wscat -c ws://localhost:3000/ws
```

## 🔒 Nginx Reverse Proxy Setup

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/execora
```

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3. Enable and Start Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/execora /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

## 📊 Monitoring Setup

### 1. View Logs

```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Save logs
docker-compose logs > logs.txt
```

### 2. Resource Monitoring

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# Process monitoring
htop
```

### 3. Database Monitoring

```bash
# Connect to database
docker-compose exec postgres psql -U execora -d execora

# Check table sizes
\dt+

# Active connections
SELECT count(*) FROM pg_stat_activity;
```

## 🔄 Backup Strategy

### 1. Database Backup

```bash
# Create backup script
nano /opt/execora/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/execora/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U execora execora | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup MinIO data
docker-compose exec -T minio mc mirror /data /backup/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/execora/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/execora/backup.sh
```

### 2. MinIO Backup

```bash
# Export MinIO data
docker-compose exec minio mc mirror /data /backup/minio
```

## 🔧 Maintenance

### Update Application

```bash
cd /opt/execora

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Clean Up Docker

```bash
# Remove unused images
docker system prune -a

# Remove old volumes (careful!)
docker volume prune
```

## 🆘 Troubleshooting

### App Won't Start

```bash
# Check logs
docker-compose logs app

# Restart service
docker-compose restart app

# Rebuild
docker-compose up -d --build app
```

### Database Connection Error

```bash
# Check PostgreSQL
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check connectivity
docker-compose exec app ping postgres
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs worker

# Check Redis
docker-compose exec redis redis-cli ping

# Restart worker
docker-compose restart worker
```

## 📈 Scaling

### Horizontal Scaling

For increased load:

1. Use external PostgreSQL (RDS, managed service)
2. Use Redis Cluster
3. Run multiple app instances behind load balancer
4. Run multiple workers
5. Use S3 instead of MinIO

### Vertical Scaling

For single server:

1. Increase VPS resources
2. Optimize Prisma connection pool
3. Add Redis caching layer
4. Enable Nginx caching

## ✅ Post-Deployment Checklist

- [ ] All services running
- [ ] SSL certificate valid
- [ ] Database backup automated
- [ ] Monitoring in place
- [ ] Firewall configured
- [ ] DNS configured
- [ ] WhatsApp webhook configured
- [ ] Test voice commands
- [ ] Test API endpoints
- [ ] Test reminders
- [ ] Document access credentials

## 📞 Support

For issues:
1. Check logs: `docker-compose logs`
2. Check health: `curl https://your-domain.com/health`
3. Review documentation
4. Open GitHub issue

---

**Congratulations! Execora is now in production! 🎉**
