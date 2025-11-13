# 🚀 DigitalOcean Deployment Checklist

Use this checklist to ensure smooth deployment to DigitalOcean.

## Pre-Deployment ✓

### 1. Create DigitalOcean Account
- [ ] Sign up at https://digitalocean.com
- [ ] Add payment method
- [ ] (Optional) Use this referral link for $200 credit: https://m.do.co/c/

### 2. Prepare Environment Files
- [ ] Create `.env` file with your credentials:
  ```bash
  cat > .env << 'EOF'
  PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i
  DATABASE_URL=postgresql://neondb_owner:npg_dNhm5vgEr8Vy@ep-tiny-night-ago05sk9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
  NODE_ENV=production
  PORT=3000
  EOF
  ```
- [ ] Verify `.env` file exists and has correct values
- [ ] (Optional) Update database URL if using different DB

### 3. Setup SSH Keys (Recommended)
- [ ] Generate SSH key if you don't have one:
  ```bash
  ssh-keygen -t ed25519 -C "your_email@example.com"
  ```
- [ ] Add SSH key to DigitalOcean account (Settings → Security → SSH Keys)

---

## Deployment Steps ✓

### 4. Create Droplet
- [ ] Go to https://cloud.digitalocean.com/droplets/new
- [ ] Select **Ubuntu 22.04 LTS**
- [ ] Choose plan:
  - [ ] **$12/month** (2GB RAM) - For 20-30 players
  - [ ] **$24/month** (4GB RAM) - For 50+ players
- [ ] Select datacenter region closest to your players
- [ ] Choose authentication method (SSH key recommended)
- [ ] Set hostname: `agar-game-server`
- [ ] Click "Create Droplet"
- [ ] **Write down droplet IP:** `___.___.___.___`

### 5. Configure Firewall (Optional but Recommended)
- [ ] In DigitalOcean dashboard, go to Networking → Firewalls
- [ ] Create new firewall
- [ ] Add inbound rules:
  - [ ] SSH (port 22) - from your IP only
  - [ ] HTTP (port 80)
  - [ ] HTTPS (port 443)
  - [ ] Custom (port 3000) - for game server
- [ ] Apply firewall to your droplet

### 6. Test SSH Connection
- [ ] Test SSH access:
  ```bash
  ssh root@YOUR_DROPLET_IP
  ```
- [ ] If prompted, type "yes" to accept fingerprint
- [ ] Exit SSH: `exit`

### 7. Deploy Application
- [ ] Set droplet IP:
  ```bash
  export DROPLET_IP=your.droplet.ip.address
  ```
- [ ] Run deployment script:
  ```bash
  ./deploy-digitalocean.sh
  ```
- [ ] Wait 5-10 minutes for first deployment
- [ ] Check for success message

---

## Post-Deployment Testing ✓

### 8. Verify Application is Running
- [ ] Open browser to: `http://YOUR_DROPLET_IP:3000`
- [ ] Game loads without errors
- [ ] Can create player and spawn
- [ ] Movement is smooth (no frame drops)
- [ ] Connection is stable (no random disconnects)

### 9. Test Gameplay
- [ ] Play for 5 minutes minimum
- [ ] Test split function (Space key)
- [ ] Test eject function (W key)
- [ ] Eat some food
- [ ] Watch for any connection issues
- [ ] Check browser console for errors (F12 → Console)

### 10. Monitor Server
- [ ] Check Docker container status:
  ```bash
  ssh root@$DROPLET_IP 'docker ps'
  ```
- [ ] View logs:
  ```bash
  ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs --tail=50'
  ```
- [ ] Check resource usage:
  ```bash
  ssh root@$DROPLET_IP 'docker stats --no-stream'
  ```

---

## Optional Enhancements ✓

### 11. Setup Custom Domain (Optional)
If you have a domain name:
- [ ] Point A record to droplet IP
- [ ] Wait for DNS propagation (5-60 minutes)
- [ ] Deploy with domain:
  ```bash
  export DROPLET_IP=your.droplet.ip.address
  export DOMAIN=game.yourdomain.com
  ./deploy-digitalocean.sh
  ```
- [ ] Test domain: `http://game.yourdomain.com`

### 12. Enable HTTPS (Optional, requires domain)
- [ ] SSH to droplet
- [ ] Install certbot:
  ```bash
  apt-get update
  apt-get install certbot python3-certbot-nginx -y
  ```
- [ ] Get SSL certificate:
  ```bash
  certbot --nginx -d game.yourdomain.com
  ```
- [ ] Test HTTPS: `https://game.yourdomain.com`
- [ ] Certificate auto-renews (certbot sets up cron job)

### 13. Setup Monitoring (Optional but Recommended)
- [ ] Create account at https://uptimerobot.com (free)
- [ ] Add new monitor:
  - Type: HTTP(s)
  - URL: `http://YOUR_DROPLET_IP:3000`
  - Interval: 5 minutes
- [ ] Add your email for alerts
- [ ] Get email when site goes down

### 14. Enable Automated Backups (Recommended)
- [ ] In DigitalOcean dashboard, go to your droplet
- [ ] Click "Backups" tab
- [ ] Enable automated backups ($2.40/month for 2GB droplet)
- [ ] Backups run weekly automatically

---

## Maintenance Tasks ✓

### Regular Tasks

#### Daily
- [ ] Check game is accessible
- [ ] Monitor for player reports of issues

#### Weekly
- [ ] Review logs for errors:
  ```bash
  npm run logs:digitalocean
  ```
- [ ] Check resource usage:
  ```bash
  ssh root@$DROPLET_IP 'docker stats --no-stream'
  ```
- [ ] Check disk space:
  ```bash
  ssh root@$DROPLET_IP 'df -h'
  ```

#### Monthly
- [ ] Update system packages:
  ```bash
  ssh root@$DROPLET_IP 'apt-get update && apt-get upgrade -y'
  ```
- [ ] Review DigitalOcean costs
- [ ] Check backup status

### When to Upgrade

Upgrade to larger droplet if you see:
- [ ] Memory usage consistently > 75%
- [ ] CPU usage consistently > 80%
- [ ] 40+ concurrent players
- [ ] Frequent container restarts

---

## Troubleshooting ✓

### Issue: Can't access game at http://DROPLET_IP:3000

**Check firewall:**
```bash
ssh root@$DROPLET_IP
ufw status
# If blocking, run:
ufw allow 3000/tcp
ufw reload
```

**Check container:**
```bash
ssh root@$DROPLET_IP 'docker ps'
# Should see "agar-game-server" running
```

**Check logs:**
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml logs --tail=100'
```

### Issue: Application crashes frequently

**Check memory:**
```bash
ssh root@$DROPLET_IP 'docker stats --no-stream'
```
If memory is > 90%, upgrade droplet size.

**Restart application:**
```bash
ssh root@$DROPLET_IP 'cd /opt/agar-game && docker-compose -f docker-compose.digitalocean.yml restart'
```

### Issue: Still experiencing frame drops or connection issues

This would be unusual on DigitalOcean. Check:
1. Your local internet connection
2. Browser console for client-side errors (F12 → Console)
3. Server logs for errors
4. Other players experiencing same issue?

If issues persist, it may be code-related rather than infrastructure.

---

## Success Criteria ✓

Your deployment is successful when:
- [ ] Game loads at http://YOUR_DROPLET_IP:3000
- [ ] No frame drops during gameplay
- [ ] Connection stays stable for 30+ minutes
- [ ] Multiple players can join
- [ ] Resource usage is reasonable (< 75% memory, < 80% CPU)
- [ ] No errors in logs or browser console

---

## Rollback Plan

If you need to revert to Cloud Run:

1. [ ] Cloud Run is still running (you didn't delete it)
2. [ ] Point traffic back to Cloud Run URL
3. [ ] Keep DigitalOcean droplet for testing
4. [ ] Debug issues before switching back

---

## Cost Tracking

### Monthly Costs

**DigitalOcean Droplet:**
- [ ] 2GB RAM: $12/month
- [ ] 4GB RAM: $24/month
- [ ] Backups: $2.40/month (20% of droplet)

**Total: $12-26/month**

**Compared to Cloud Run: $40-80/month**
**Savings: $28-68/month** 💰

---

## Support Resources

- **DigitalOcean Docs:** https://docs.digitalocean.com
- **Community:** https://www.digitalocean.com/community
- **Support:** Open ticket in DigitalOcean dashboard
- **Your docs:** See `DIGITALOCEAN_SETUP.md` for complete guide

---

## Final Notes

✅ **Deployment complete!** Your game is now running on stable, dedicated infrastructure.

🎮 **Test thoroughly** - Play for at least 30 minutes to confirm stability.

📊 **Monitor regularly** - Check logs and resource usage weekly.

💰 **Enjoy savings** - You're saving $28-68/month vs Cloud Run!

🚀 **Scale when needed** - Upgrade droplet as player count grows.

---

**Last Updated:** $(date)
**Deployment Status:** [ ] Not Started | [ ] In Progress | [ ] Complete | [ ] Testing | [ ] Live

