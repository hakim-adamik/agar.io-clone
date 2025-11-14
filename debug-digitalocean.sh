#!/bin/bash

# Debug script for DigitalOcean deployment
# This helps diagnose Privy authentication issues

set -e

echo "🔍 DigitalOcean Deployment Debug Script"
echo "========================================"
echo ""

# Configuration
DROPLET_IP="${DROPLET_IP:-164.92.211.194}"
DROPLET_USER="${DROPLET_USER:-root}"
APP_DIR="/opt/agar-game"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Target Droplet: $DROPLET_IP${NC}"
echo ""

# Step 1: Check if we can connect
echo -e "${YELLOW}1. Testing SSH connection...${NC}"
if ssh -o BatchMode=yes -o ConnectTimeout=5 $DROPLET_USER@$DROPLET_IP exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect via SSH${NC}"
    exit 1
fi
echo ""

# Step 2: Check Docker container status
echo -e "${YELLOW}2. Checking Docker container status...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
cd /opt/agar-game 2>/dev/null || { echo "App directory not found"; exit 1; }
echo "Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Container logs (last 5 lines):"
docker logs agar-game-server --tail 5 2>&1 | grep -E "(PRIVY|ENV|environment)" || echo "No environment logs found"
EOF
echo ""

# Step 3: Check environment variables inside container
echo -e "${YELLOW}3. Checking environment variables inside container...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
echo "Environment variables in container:"
docker exec agar-game-server sh -c 'echo "PRIVY_APP_ID=$PRIVY_APP_ID"'
docker exec agar-game-server sh -c 'echo "NODE_ENV=$NODE_ENV"'
docker exec agar-game-server sh -c 'echo "DATABASE_URL present: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"'
EOF
echo ""

# Step 4: Check if Privy bundle was built correctly
echo -e "${YELLOW}4. Checking Privy bundle in container...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
echo "Checking for Privy auth bundle:"
docker exec agar-game-server sh -c 'ls -la /usr/src/app/src/client/auth/privy-auth-bundle.js 2>/dev/null && echo "✅ Privy bundle exists" || echo "❌ Privy bundle missing"'
echo ""
echo "Checking if PRIVY_APP_ID is in the bundle:"
docker exec agar-game-server sh -c 'grep -o "cmhkpg56r02vbjr0cdeex8n7i" /usr/src/app/src/client/auth/privy-auth-bundle.js 2>/dev/null | head -1 && echo "✅ App ID found in bundle" || echo "❌ App ID NOT in bundle"'
EOF
echo ""

# Step 5: Test the deployed app
echo -e "${YELLOW}5. Testing the deployed application...${NC}"
echo "Testing HTTP response from http://$DROPLET_IP:3000/"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$DROPLET_IP:3000/ || echo "Failed")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Application is responding (HTTP $response)${NC}"

    # Check if ENV is injected in HTML
    echo ""
    echo "Checking if window.ENV is injected in HTML:"
    curl -s http://$DROPLET_IP:3000/ | grep -o "window.ENV.*PRIVY_APP_ID" | head -1 && echo -e "${GREEN}✅ window.ENV found${NC}" || echo -e "${RED}❌ window.ENV NOT found${NC}"

    # Check the actual PRIVY_APP_ID value
    echo ""
    echo "Checking PRIVY_APP_ID value in HTML:"
    curl -s http://$DROPLET_IP:3000/ | grep -oP "PRIVY_APP_ID:\s*'[^']*'" | head -1 || echo "❌ PRIVY_APP_ID not found in HTML"
else
    echo -e "${RED}❌ Application not responding (HTTP $response)${NC}"
fi
echo ""

# Step 6: Check firewall rules
echo -e "${YELLOW}6. Checking DigitalOcean firewall...${NC}"
echo "Checking if port 3000 is accessible:"
nc -zv $DROPLET_IP 3000 2>&1 | head -1 || echo "Port 3000 might be blocked"
echo ""

# Step 7: Check Privy Dashboard Configuration
echo -e "${YELLOW}7. Privy Dashboard Configuration Checklist:${NC}"
echo ""
echo -e "${BLUE}Please verify in your Privy Dashboard (https://dashboard.privy.io):${NC}"
echo ""
echo "1. [ ] App ID matches: cmhkpg56r02vbjr0cdeex8n7i"
echo "2. [ ] Allowed domains includes one of:"
echo "      - http://$DROPLET_IP:3000"
echo "      - http://$DROPLET_IP"
echo "      - $DROPLET_IP:3000"
echo "      - Or wildcard: *"
echo "3. [ ] OAuth redirect URIs (if using social login) includes:"
echo "      - http://$DROPLET_IP:3000"
echo "4. [ ] App is not in 'Test Mode' (unless intended)"
echo "5. [ ] Login methods are enabled (Google, Discord, etc.)"
echo ""

# Step 8: Rebuild suggestion
echo -e "${YELLOW}8. Quick Fix Commands:${NC}"
echo ""
echo "If PRIVY_APP_ID is missing, run these commands on your droplet:"
echo -e "${BLUE}ssh $DROPLET_USER@$DROPLET_IP${NC}"
echo -e "${BLUE}cd $APP_DIR${NC}"
echo -e "${BLUE}export PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i${NC}"
echo -e "${BLUE}export DATABASE_URL='postgresql://neondb_owner:npg_X0hNZFwe8Lrk@ep-wild-bar-agks6pgk-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'${NC}"
echo -e "${BLUE}docker-compose -f docker-compose.digitalocean.yml down${NC}"
echo -e "${BLUE}docker-compose -f docker-compose.digitalocean.yml build --build-arg PRIVY_APP_ID=\$PRIVY_APP_ID${NC}"
echo -e "${BLUE}docker-compose -f docker-compose.digitalocean.yml up -d${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}Debug script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the Privy Dashboard settings above"
echo "2. If PRIVY_APP_ID is missing in the bundle, run the rebuild commands"
echo "3. Check browser console for errors when trying to authenticate"