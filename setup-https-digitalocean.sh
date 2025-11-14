#!/bin/bash

# Setup HTTPS with Let's Encrypt for DigitalOcean deployment
# This script configures Nginx with SSL for your Agar.io clone

set -e

echo "🔒 Setting up HTTPS for Agar.io Clone on DigitalOcean"
echo "====================================================="
echo ""

# Configuration
DROPLET_IP="${DROPLET_IP:-164.92.211.194}"
DROPLET_USER="${DROPLET_USER:-root}"
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN not set${NC}"
    echo ""
    echo "Please set your domain name:"
    echo "  export DOMAIN=yourdomain.com"
    echo "  export EMAIL=your@email.com"
    echo "  ./setup-https-digitalocean.sh"
    echo ""
    echo "Note: Your domain must already point to $DROPLET_IP"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${YELLOW}⚠️  EMAIL not set, using webmaster@$DOMAIN${NC}"
    EMAIL="webmaster@$DOMAIN"
fi

echo -e "${BLUE}Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  Droplet IP: $DROPLET_IP"
echo ""

# Create Nginx configuration
echo -e "${YELLOW}Creating Nginx configuration...${NC}"

cat > /tmp/agar-nginx-ssl.conf << EOF
# Agar.io Game Server - Nginx HTTPS Configuration
upstream agar_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/agar-access.log;
    error_log /var/log/nginx/agar-error.log;

    # WebSocket and HTTP proxy
    location / {
        proxy_pass http://agar_backend;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts for long-lived connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Buffering off for real-time
        proxy_buffering off;
    }
}
EOF

# Copy configuration to droplet
scp /tmp/agar-nginx-ssl.conf $DROPLET_USER@$DROPLET_IP:/tmp/

# Setup SSL on droplet
echo -e "${YELLOW}Setting up SSL on droplet...${NC}"

ssh $DROPLET_USER@$DROPLET_IP << ENDSSH
set -e

# Install required packages
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

# Create directory for certbot
mkdir -p /var/www/certbot

# Copy Nginx config (without SSL first, for initial cert generation)
cat > /etc/nginx/sites-available/agar-game << 'NGINX_CONF'
upstream agar_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://agar_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }
}
NGINX_CONF

# Enable site
ln -sf /etc/nginx/sites-available/agar-game /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo "✅ Nginx configured"

# Get SSL certificate
echo "Obtaining SSL certificate..."
certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --non-interactive

# Now update Nginx config with SSL
mv /tmp/agar-nginx-ssl.conf /etc/nginx/sites-available/agar-game

# Test and reload with SSL
nginx -t
systemctl reload nginx

echo "✅ SSL certificate installed"

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo "✅ Auto-renewal configured"
ENDSSH

rm /tmp/agar-nginx-ssl.conf

echo ""
echo -e "${GREEN}🎉 HTTPS setup complete!${NC}"
echo ""
echo -e "${BLUE}Your game is now available at:${NC}"
echo -e "${GREEN}  https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}Important: Update Privy Dashboard:${NC}"
echo "1. Go to https://dashboard.privy.io"
echo "2. Update 'Allowed origins' to include:"
echo "   - https://$DOMAIN"
echo "3. Save changes"
echo ""
echo -e "${YELLOW}Note: HTTP traffic will automatically redirect to HTTPS${NC}"
echo ""
echo -e "${GREEN}✅ All done!${NC}"