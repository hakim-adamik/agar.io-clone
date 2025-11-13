# 🎮 Quick Command Reference

## Setup & Deployment

### First Time Setup
```bash
# 1. Create .env file
cat > .env << 'EOF'
PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i
DATABASE_URL=postgresql://neondb_owner:npg_dNhm5vgEr8Vy@ep-tiny-night-ago05sk9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=3000
EOF

# 2. Set droplet IP
export DROPLET_IP=your.droplet.ip.address

# 3. Deploy
./deploy-digitalocean.sh
```

### Update Deployment
```bash
export DROPLET_IP=your.droplet.ip.address
./deploy-digitalocean.sh
```

---

## Monitoring

### View Logs (Real-time)
```bash
npm run logs:digitalocean
```

### View Logs (Last 100 Lines)
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs --tail=100'
```

### Check Container Status
```bash
ssh root@$DROPLET_IP 'docker ps'
```

### Check Resource Usage
```bash
ssh root@$DROPLET_IP 'docker stats'
```

### View PM2 Status (Inside Container)
```bash
ssh root@$DROPLET_IP 'docker exec agar-game-server pm2 status'
```

---

## Management

### Restart Application
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'
```

### Stop Application
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml down'
```

### Start Application
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml up -d'
```

### Rebuild & Restart
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml up -d --build'
```

---

## Debugging

### Access Container Shell
```bash
ssh root@$DROPLET_IP 'docker exec -it agar-game-server sh'
```

### Check Disk Space
```bash
ssh root@$DROPLET_IP 'df -h'
```

### Check Network Connections
```bash
ssh root@$DROPLET_IP 'ss -tn | grep :3000 | wc -l'
```

### View Nginx Logs (if using domain)
```bash
ssh root@$DROPLET_IP 'tail -f /var/log/nginx/agar-access.log'
ssh root@$DROPLET_IP 'tail -f /var/log/nginx/agar-error.log'
```

---

## Maintenance

### Update System Packages
```bash
ssh root@$DROPLET_IP 'apt-get update && apt-get upgrade -y'
```

### Clean Docker System
```bash
ssh root@$DROPLET_IP 'docker system prune -af'
```

### Restart Docker Service
```bash
ssh root@$DROPLET_IP 'systemctl restart docker'
```

---

## Backup

### Create Manual Snapshot
Via DigitalOcean Dashboard:
1. Go to droplet page
2. Click "Snapshots"
3. Click "Take Snapshot"
4. Name it (e.g., "pre-update-2024-01-15")

### Backup Application Files
```bash
# From droplet to local machine
rsync -avz root@$DROPLET_IP:/opt/agar-game/ ./backup-$(date +%Y%m%d)/
```

---

## HTTPS Setup (with domain)

### Install Certbot
```bash
ssh root@$DROPLET_IP 'apt-get install certbot python3-certbot-nginx -y'
```

### Get SSL Certificate
```bash
ssh root@$DROPLET_IP 'certbot --nginx -d game.yourdomain.com'
```

### Renew Certificate (automatic, but can force)
```bash
ssh root@$DROPLET_IP 'certbot renew --dry-run'
```

---

## Performance Testing

### Load Test (from your machine)
```bash
# Install apache bench
sudo apt-get install apache2-utils

# Test with 100 concurrent connections
ab -n 1000 -c 100 http://$DROPLET_IP:3000/
```

### Monitor CPU/RAM During Gameplay
```bash
ssh root@$DROPLET_IP 'watch -n 1 docker stats --no-stream'
```

---

## Firewall

### Check Firewall Status
```bash
ssh root@$DROPLET_IP 'ufw status'
```

### Open Required Ports
```bash
ssh root@$DROPLET_IP 'ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3000/tcp && ufw reload'
```

---

## Environment Variables

### View Current Environment
```bash
ssh root@$DROPLET_IP 'cat /opt/agar-game/.env'
```

### Edit Environment Variables
```bash
# Edit locally, then redeploy
nano .env
./deploy-digitalocean.sh
```

---

## Quick Shortcuts

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# DigitalOcean shortcuts
export DROPLET_IP=your.droplet.ip.address
alias game-ssh='ssh root@$DROPLET_IP'
alias game-logs='ssh root@$DROPLET_IP "cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs -f"'
alias game-restart='ssh root@$DROPLET_IP "cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart"'
alias game-status='ssh root@$DROPLET_IP "docker ps"'
alias game-stats='ssh root@$DROPLET_IP "docker stats --no-stream"'
alias game-deploy='./deploy-digitalocean.sh'
```

Then reload: `source ~/.bashrc` (or `source ~/.zshrc`)

Now you can use:
- `game-ssh` - SSH to droplet
- `game-logs` - View logs
- `game-restart` - Restart app
- `game-status` - Check status
- `game-stats` - View resource usage
- `game-deploy` - Deploy updates

---

## Troubleshooting Commands

### Container Won't Start
```bash
# Check detailed logs
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs'

# Check if port is in use
ssh root@$DROPLET_IP 'ss -tlnp | grep :3000'

# Remove old containers and rebuild
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml down && docker-compose -f docker-compose.digitalocean.yml up -d --build'
```

### High Memory Usage
```bash
# Check what's using memory
ssh root@$DROPLET_IP 'docker stats --no-stream'
ssh root@$DROPLET_IP 'free -h'

# Restart to clear memory
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'
```

### Connection Issues
```bash
# Check if app is responding
curl http://$DROPLET_IP:3000

# Check active connections
ssh root@$DROPLET_IP 'ss -tn | grep :3000'

# Check firewall
ssh root@$DROPLET_IP 'ufw status'
```

---

## Getting Help

1. **Check logs first:** `npm run logs:digitalocean`
2. **Check status:** `ssh root@$DROPLET_IP 'docker ps'`
3. **Check resources:** `ssh root@$DROPLET_IP 'docker stats'`
4. **Read docs:** See `DIGITALOCEAN_SETUP.md`
5. **Check browser console:** Press F12 in browser

---

**Save this file** for quick reference! 🔖

