#!/bin/bash

# Agar.io Clone - DigitalOcean Deployment Script
# This script deploys your application to a DigitalOcean Droplet

set -e  # Exit on any error

echo "🚀 Starting Agar.io Clone deployment to DigitalOcean..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="${DROPLET_IP:-}"
DROPLET_USER="${DROPLET_USER:-root}"
APP_DIR="/opt/agar-game"
DOMAIN="${DOMAIN:-}"  # Optional: your domain name
PRIVY_APP_ID="${PRIVY_APP_ID:-cmhkpg56r02vbjr0cdeex8n7i}"  # Default Privy App ID

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Droplet IP: ${DROPLET_IP:-Not set}"
echo "  User: $DROPLET_USER"
echo "  App Directory: $APP_DIR"
echo "  Domain: ${DOMAIN:-None (using IP)}"
echo "  Privy App ID: $PRIVY_APP_ID"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

if [ -z "$DROPLET_IP" ]; then
    echo -e "${RED}❌ DROPLET_IP environment variable not set${NC}"
    echo ""
    echo "Please set it before running this script:"
    echo "  export DROPLET_IP=your.droplet.ip.address"
    echo ""
    echo "Or run with:"
    echo "  DROPLET_IP=your.droplet.ip.address ./deploy-digitalocean.sh"
    exit 1
fi

# Check if ssh key is set up
echo "Testing SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 $DROPLET_USER@$DROPLET_IP exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH key authentication is working${NC}"
else
    echo -e "${YELLOW}⚠️  SSH key authentication not set up${NC}"
    echo ""
    echo "You have two options:"
    echo ""
    echo "Option 1 (Recommended): Setup SSH key authentication"
    echo "  - More secure"
    echo "  - No password prompts"
    echo "  - Industry standard"
    echo ""
    echo "Option 2: Continue with password"
    echo "  - You'll need to enter password multiple times"
    echo "  - Less secure"
    echo ""
    read -p "Setup SSH key now? (Y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}Continuing with password authentication...${NC}"
        echo "You'll need to enter your password several times during deployment."
        echo ""
        read -p "Press enter to continue..."
    else
        echo -e "${BLUE}Setting up SSH key authentication...${NC}"
        echo ""

        # Check if user has SSH key
        if [ ! -f ~/.ssh/id_rsa.pub ] && [ ! -f ~/.ssh/id_ed25519.pub ]; then
            echo "No SSH key found. Generating new SSH key..."
            ssh-keygen -t ed25519 -C "agar-game-deployment" -f ~/.ssh/id_ed25519 -N ""
            echo -e "${GREEN}✅ SSH key generated${NC}"
        fi

        # Determine which key to use
        if [ -f ~/.ssh/id_ed25519.pub ]; then
            SSH_KEY_FILE=~/.ssh/id_ed25519.pub
        elif [ -f ~/.ssh/id_rsa.pub ]; then
            SSH_KEY_FILE=~/.ssh/id_rsa.pub
        fi

        echo "Copying SSH key to droplet..."
        echo -e "${YELLOW}You'll need to enter your droplet password one time:${NC}"

        if command -v ssh-copy-id &> /dev/null; then
            # Force password authentication (don't try existing keys)
            ssh-copy-id -o PubkeyAuthentication=no -o PreferredAuthentications=password -i $SSH_KEY_FILE $DROPLET_USER@$DROPLET_IP
        else
            # Fallback for systems without ssh-copy-id (force password auth)
            cat $SSH_KEY_FILE | ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password $DROPLET_USER@$DROPLET_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
        fi

        # Test connection
        if ssh -o BatchMode=yes -o ConnectTimeout=5 $DROPLET_USER@$DROPLET_IP exit 2>/dev/null; then
            echo -e "${GREEN}✅ SSH key authentication setup successful!${NC}"
            echo "You won't need to enter password again for this droplet."
        else
            echo -e "${RED}❌ SSH key setup failed${NC}"
            echo "Continuing with password authentication..."
        fi
        echo ""
    fi
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Step 2: Build locally
echo -e "${YELLOW}🔨 Building application locally...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 3: Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from example...${NC}"
    cp .env.digitalocean.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual values${NC}"
    read -p "Press enter to continue after editing .env..."
fi

# Step 4: Sync files to droplet
echo -e "${YELLOW}📦 Syncing files to droplet...${NC}"
echo "This may take a minute..."

# Create app directory on droplet
ssh $DROPLET_USER@$DROPLET_IP "mkdir -p $APP_DIR"

# Sync files (excluding node_modules, build artifacts, etc.)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude 'bin' \
    --exclude '*.log' \
    --exclude '.env' \
    . $DROPLET_USER@$DROPLET_IP:$APP_DIR/

# Copy .env separately
scp .env $DROPLET_USER@$DROPLET_IP:$APP_DIR/.env

echo -e "${GREEN}✅ Files synced${NC}"
echo ""

# Step 5: Setup and deploy on droplet
echo -e "${YELLOW}🐳 Setting up Docker on droplet...${NC}"

ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
set -e

# Update system
echo "Updating system packages..."
apt-get update -qq

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt-get install -y docker-compose
fi

# Install nginx if not present (for reverse proxy)
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
fi

echo "✅ Docker and dependencies installed"
ENDSSH

echo -e "${GREEN}✅ Docker setup complete${NC}"
echo ""

# Step 6: Build and start the application
echo -e "${YELLOW}🚀 Building and starting application...${NC}"

# Pass variables through SSH using EOF instead of 'ENDSSH' to allow variable expansion
ssh $DROPLET_USER@$DROPLET_IP << EOF
set -e
cd $APP_DIR

# Set environment variables for Docker Compose
export PRIVY_APP_ID="$PRIVY_APP_ID"
export DATABASE_URL="postgresql://neondb_owner:npg_X0hNZFwe8Lrk@ep-wild-bar-agks6pgk-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.digitalocean.yml down 2>/dev/null || true

# Build the application with build arguments
echo "Building Docker image with PRIVY_APP_ID=$PRIVY_APP_ID..."
docker-compose -f docker-compose.digitalocean.yml build --build-arg PRIVY_APP_ID=$PRIVY_APP_ID

# Start the application
echo "Starting application..."
docker-compose -f docker-compose.digitalocean.yml up -d

# Wait for container to be healthy
echo "Waiting for application to be ready..."
sleep 10

# Check if container is running
if docker ps | grep -q agar-game-server; then
    echo "✅ Application is running"
else
    echo "❌ Application failed to start"
    docker-compose -f docker-compose.digitalocean.yml logs --tail=50
    exit 1
fi

echo "✅ Deployment complete"
EOF

echo -e "${GREEN}✅ Application deployed successfully${NC}"
echo ""

# Step 7: Configure Nginx (optional, if domain is set)
if [ -n "$DOMAIN" ]; then
    echo -e "${YELLOW}🌐 Configuring Nginx for domain: $DOMAIN${NC}"

    # Create Nginx config
    cat > /tmp/agar-nginx.conf << EOF
# Agar.io Game Server - Nginx Configuration
upstream agar_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/agar-access.log;
    error_log /var/log/nginx/agar-error.log;

    # WebSocket and HTTP
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

    # Copy to droplet and enable
    scp /tmp/agar-nginx.conf $DROPLET_USER@$DROPLET_IP:/tmp/agar-nginx.conf
    ssh $DROPLET_USER@$DROPLET_IP << ENDSSH
mv /tmp/agar-nginx.conf /etc/nginx/sites-available/agar-game
ln -sf /etc/nginx/sites-available/agar-game /etc/nginx/sites-enabled/agar-game
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"
ENDSSH

    rm /tmp/agar-nginx.conf

    echo -e "${GREEN}✅ Nginx configured for $DOMAIN${NC}"
    echo ""
    echo -e "${BLUE}🔒 To enable HTTPS, run on the droplet:${NC}"
    echo "  apt-get install certbot python3-certbot-nginx"
    echo "  certbot --nginx -d $DOMAIN"
fi

# Step 8: Show status and URLs
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}🌐 Access your game at:${NC}"
if [ -n "$DOMAIN" ]; then
    echo -e "${GREEN}  http://$DOMAIN${NC}"
    echo -e "${GREEN}  https://$DOMAIN${NC} (after setting up SSL)"
else
    echo -e "${GREEN}  http://$DROPLET_IP:3000${NC}"
fi
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo "  SSH to droplet:    ssh $DROPLET_USER@$DROPLET_IP"
echo "  View logs:         ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose -f docker-compose.digitalocean.yml logs -f'"
echo "  Restart app:       ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose -f docker-compose.digitalocean.yml restart'"
echo "  Stop app:          ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose -f docker-compose.digitalocean.yml down'"
echo "  Update app:        ./deploy-digitalocean.sh"
echo ""
echo -e "${BLUE}💡 Monitor your application:${NC}"
echo "  CPU/Memory:        ssh $DROPLET_USER@$DROPLET_IP 'docker stats'"
echo "  Container status:  ssh $DROPLET_USER@$DROPLET_IP 'docker ps'"
echo ""
echo -e "${GREEN}✅ All done!${NC}"

