# DigitalOcean Deployment Guide

## Why DigitalOcean is Better for Your Game

### Problems with Cloud Run (that you experienced):
- ❌ Random frame drops (memory constraints, GC pauses)
- ❌ Connection suddenly stops (container scaling, no session affinity)
- ❌ WebSocket disconnections (60-minute timeout limit)
- ❌ Cold starts causing delays

### DigitalOcean Advantages:
- ✅ **Persistent connections** - No arbitrary timeouts
- ✅ **Consistent performance** - No cold starts
- ✅ **Full control** - Dedicated resources
- ✅ **Lower latency** - No container orchestration overhead
- ✅ **Better value** - $12-24/month vs $40-80/month
- ✅ **Session affinity** - Same server every time

---

## Quick Start (3 Steps)

### Step 1: Create DigitalOcean Droplet

1. **Go to:** https://cloud.digitalocean.com/droplets/new

2. **Select:**
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic
   - **CPU:** Regular (2GB RAM / 1 vCPU) - **$12/month**
     - For 20-30 players: 2GB is sufficient
     - For 50+ players: Upgrade to 4GB RAM ($24/month)
   - **Datacenter:** Choose closest to your players
     - Europe: Frankfurt, Amsterdam, or London
     - US: New York or San Francisco
   - **Authentication:** SSH Key (recommended) or Password
   - **Hostname:** agar-game-server

3. **Click:** Create Droplet

4. **Wait 60 seconds** for droplet to be ready

5. **Note your droplet's IP address** (shown in dashboard)

### Step 2: Configure Local Environment

Create a `.env` file in this directory with your credentials:

```bash
# Create .env file
cat > .env << 'EOF'
# Privy Authentication
PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_dNhm5vgEr8Vy@ep-tiny-night-ago05sk9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Server Configuration
NODE_ENV=production
PORT=3000
EOF
```

### Step 3: Deploy

```bash
# Set your droplet IP
export DROPLET_IP=your.droplet.ip.address

# Deploy (first time takes 5-10 minutes)
./deploy-digitalocean.sh
```

**That's it!** Your game will be available at `http://YOUR_DROPLET_IP:3000`

---

## Complete Setup Instructions

### Prerequisites

On your **local machine**, you need:
- SSH access to the droplet
- rsync installed (`apt-get install rsync` or `brew install rsync`)

The deployment script will automatically install on the **droplet**:
- Docker
- Docker Compose
- Nginx (optional, for custom domain)

### SSH Key Setup (Automatic)

The deployment script **automatically sets up SSH keys** for you!

When you run `./deploy-digitalocean.sh`, it will:
1. Check if SSH keys are configured
2. If not, offer to set them up automatically
3. You enter password **once**, then never again

**Manual setup?** See `SSH_KEY_SETUP.md` for detailed instructions.

### Deploy with Custom Domain (Optional)

If you have a domain name:

```bash
# 1. Point your domain's A record to droplet IP
#    Example: game.yourdomain.com -> 159.89.123.45

# 2. Deploy with domain
export DROPLET_IP=your.droplet.ip.address
export DOMAIN=game.yourdomain.com
./deploy-digitalocean.sh

# 3. On the droplet, enable HTTPS (free with Let's Encrypt)
ssh root@$DROPLET_IP
apt-get install certbot python3-certbot-nginx -y
certbot --nginx -d $DOMAIN
```

Your game will be available at `https://game.yourdomain.com`

---

## Architecture

### What Gets Deployed:

```
DigitalOcean Droplet
├── Docker Container (agar-game-server)
│   ├── Node.js 18
│   ├── PM2 Process Manager
│   ├── Your Game Server
│   └── Socket.io WebSocket Server
│
└── Nginx Reverse Proxy (optional)
    ├── HTTP/HTTPS Termination
    ├── WebSocket Upgrade
    └── Load Balancing (future)
```

### Key Components:

1. **Docker Container**
   - Isolated environment
   - Auto-restart on crashes
   - Resource limits
   - Health checks

2. **PM2 Process Manager**
   - Keeps Node.js running
   - Auto-restart on errors
   - Memory monitoring
   - Log management

3. **Nginx** (optional, with domain)
   - HTTPS support
   - Better WebSocket handling
   - Can add load balancing later

---

## Monitoring & Management

### View Logs

```bash
# Real-time logs
ssh root@$DROPLET_IP
cd /opt/agar-game
docker-compose -f docker-compose.digitalocean.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.digitalocean.yml logs --tail=100
```

### Check Status

```bash
# Container status
docker ps

# Resource usage
docker stats

# PM2 status (inside container)
docker exec agar-game-server pm2 status
```

### Common Commands

```bash
# Restart application
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'

# Stop application
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml down'

# Start application
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml up -d'

# Update application (redeploy)
./deploy-digitalocean.sh
```

### Performance Monitoring

Monitor your game server performance:

```bash
# SSH to droplet
ssh root@$DROPLET_IP

# Install htop for better monitoring
apt-get install htop -y
htop

# Monitor specific container
docker stats agar-game-server

# Check WebSocket connections
ss -tn | grep :3000 | wc -l
```

---

## Scaling Guide

### When to Upgrade

**Upgrade to 4GB RAM ($24/month) if you see:**
- Memory usage consistently above 75%
- Frequent restarts due to memory
- 40+ concurrent players

**Upgrade to 8GB RAM ($48/month) if you see:**
- 80+ concurrent players
- Multiple arenas active
- Database queries slowing down

### How to Upgrade

1. **In DigitalOcean Dashboard:**
   - Power off droplet
   - Click "Resize"
   - Select larger plan
   - Power on

2. **No code changes needed** - your deployment continues working

### Horizontal Scaling (Future)

For 200+ players, consider:
- Multiple droplets
- Load balancer
- Redis for shared state
- Database connection pooling

---

## Cost Comparison

| Solution | Monthly Cost | Performance | Stability |
|----------|-------------|-------------|-----------|
| **Cloud Run (old)** | $40-80 | Poor | Unstable |
| **DigitalOcean 2GB** | $12 | Excellent | Very Stable |
| **DigitalOcean 4GB** | $24 | Excellent | Very Stable |
| **DigitalOcean 8GB** | $48 | Excellent | Very Stable |

**You save $28-68/month** while getting better performance! 💰

---

## Troubleshooting

### Application won't start

```bash
# Check container logs
ssh root@$DROPLET_IP
cd /opt/agar-game
docker-compose -f docker-compose.digitalocean.yml logs

# Common issues:
# - .env file missing -> Create it with your credentials
# - Port 3000 in use -> Change PORT in .env
# - Build failed -> Check npm install logs
```

### Can't connect from browser

```bash
# Check if port is open
ssh root@$DROPLET_IP
ufw status

# If firewall is blocking, allow port 3000
ufw allow 3000/tcp
ufw reload

# Or disable firewall (not recommended)
ufw disable
```

### High memory usage

```bash
# Restart to clear memory
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'

# If persistent, upgrade droplet size
```

### Connection still dropping

Check client browser console for errors:
- `[Socket] Connected successfully` - Good
- `[Socket] Connection error` - Check server logs
- `[Socket] Reconnecting...` - Network issue, will auto-recover

---

## Security Best Practices

### 1. Firewall Configuration

```bash
ssh root@$DROPLET_IP

# Enable UFW firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Game server (if no nginx)
ufw enable
```

### 2. Use Non-Root User (Recommended)

```bash
# On droplet
adduser gameserver
usermod -aG sudo gameserver
usermod -aG docker gameserver

# Then deploy with:
export DROPLET_USER=gameserver
./deploy-digitalocean.sh
```

### 3. Enable Automatic Security Updates

```bash
ssh root@$DROPLET_IP
apt-get install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### 4. Setup HTTPS (Free with Let's Encrypt)

See "Deploy with Custom Domain" section above.

---

## Backup & Disaster Recovery

### Automated Backups

DigitalOcean offers automated backups:
- **Cost:** 20% of droplet cost (~$2.40/month for 2GB)
- **Frequency:** Weekly
- **Enable:** Droplet settings → Backups

### Manual Snapshot

```bash
# Create snapshot from dashboard or CLI
doctl compute droplet-action snapshot YOUR_DROPLET_ID --snapshot-name "pre-update-backup"
```

### Database Backups

Your database (Neon) has automatic backups built-in.

---

## Migration from Cloud Run

Your Cloud Run deployment continues working during migration:

1. **Deploy to DigitalOcean** (new URL)
2. **Test thoroughly** on DigitalOcean
3. **Update DNS** to point to DigitalOcean
4. **Monitor** for 24-48 hours
5. **Shut down Cloud Run** when confident

No downtime needed!

---

## Next Steps After Deployment

1. ✅ **Test the game** - Play for 30+ minutes
2. ✅ **Monitor logs** - Watch for errors
3. ✅ **Check performance** - Use browser developer tools
4. ✅ **Setup domain** (optional) - Better than IP address
5. ✅ **Enable HTTPS** (optional) - Required for some browsers
6. ✅ **Setup monitoring** - UptimeRobot or similar
7. ✅ **Configure backups** - Enable automated backups

---

## Support

### Documentation
- DigitalOcean: https://docs.digitalocean.com
- Docker: https://docs.docker.com
- PM2: https://pm2.keymetrics.io

### Common Issues
- See Troubleshooting section above
- Check Docker logs for errors
- Verify .env file has correct values

---

## Files Created

- `Dockerfile.digitalocean` - Docker build configuration
- `docker-compose.digitalocean.yml` - Container orchestration
- `ecosystem.config.js` - PM2 process management
- `deploy-digitalocean.sh` - Automated deployment script
- `DIGITALOCEAN_SETUP.md` - This guide

**Ready to deploy?** Run `./deploy-digitalocean.sh` 🚀

