# ⚡ Quick Start: Deploy to DigitalOcean in 5 Minutes

## Step 1: Create Droplet (2 minutes)

1. Go to: https://cloud.digitalocean.com/droplets/new
2. Choose:
   - **Ubuntu 22.04**
   - **$12/month** (2GB RAM)
   - **Datacenter closest to you**
3. Click "Create Droplet"
4. **Copy your droplet's IP address**

## Step 2: Create .env File (30 seconds)

```bash
cat > .env << 'EOF'
PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i
DATABASE_URL=postgresql://neondb_owner:npg_dNhm5vgEr8Vy@ep-tiny-night-ago05sk9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=3000
EOF
```

## Step 3: Deploy (2 minutes)

```bash
export DROPLET_IP=your.droplet.ip.address
./deploy-digitalocean.sh
```

**Note:** The script will automatically setup SSH keys if needed.
You'll enter your password **once**, then never again! 🔑

## Done! 🎉

Your game is now live at: **http://YOUR_DROPLET_IP:3000**

---

## Common Commands

```bash
# View logs
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs -f'

# Restart
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'

# Update
./deploy-digitalocean.sh
```

---

## Need More Help?

See `DIGITALOCEAN_SETUP.md` for complete documentation.

---

## Why DigitalOcean > Cloud Run?

| Feature | Cloud Run | DigitalOcean |
|---------|-----------|--------------|
| **Frame Drops** | ❌ Frequent | ✅ None |
| **Connection Stability** | ❌ Drops | ✅ Stable |
| **WebSocket** | ❌ 60min limit | ✅ Unlimited |
| **Cost/month** | $40-80 | **$12-24** |
| **Setup Time** | 10min | **5min** |

**You'll save $28-68/month** with better performance! 💰

