# 🔑 SSH Key Setup Guide

## Why SSH Keys?

SSH keys eliminate password prompts and are **much more secure** than passwords:

✅ No need to enter password repeatedly
✅ More secure than password authentication
✅ Industry standard for server access
✅ Required for automation
✅ Can't be brute-forced like passwords

---

## Automatic Setup (Recommended)

The deployment script now **automatically sets up SSH keys** for you!

Just run:
```bash
export DROPLET_IP=your.droplet.ip.address
./deploy-digitalocean.sh
```

When prompted, choose **"Yes"** to setup SSH key. You'll enter your password **one time only**, then never again.

---

## Manual Setup (If Needed)

If you want to set up SSH keys manually before deployment:

### Step 1: Generate SSH Key (if you don't have one)

```bash
# Check if you already have a key
ls -la ~/.ssh/id_*.pub

# If no key exists, generate one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Press Enter to accept default location
# Press Enter twice to skip passphrase (or set one if you prefer)
```

### Step 2: Copy Key to Droplet

**Option A: Using ssh-copy-id (easiest)**
```bash
ssh-copy-id root@YOUR_DROPLET_IP
# Enter your droplet password when prompted
```

**Option B: Manual copy (if ssh-copy-id not available)**
```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub

# Copy the output, then SSH to droplet
ssh root@YOUR_DROPLET_IP

# On the droplet, paste the key
mkdir -p ~/.ssh
echo "paste-your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
exit
```

**Option C: Through DigitalOcean Dashboard (before creating droplet)**
1. Go to: https://cloud.digitalocean.com/account/security
2. Click "Add SSH Key"
3. Paste your public key: `cat ~/.ssh/id_ed25519.pub`
4. Name it (e.g., "My Laptop")
5. When creating droplet, select this SSH key

### Step 3: Test Connection

```bash
ssh root@YOUR_DROPLET_IP
# Should connect without password!
```

---

## Troubleshooting

### "Permission denied (publickey)"

Your key isn't properly installed. Try:
```bash
ssh-copy-id -f root@YOUR_DROPLET_IP
```

### "Too many authentication failures"

You have too many SSH keys. Specify which one to use:
```bash
ssh -i ~/.ssh/id_ed25519 root@YOUR_DROPLET_IP
```

Then update your `~/.ssh/config`:
```bash
cat >> ~/.ssh/config << EOF
Host YOUR_DROPLET_IP
  User root
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF
```

### Can't find ssh-copy-id (Windows)

**Option 1: Use Git Bash** (has ssh-copy-id)

**Option 2: Use WSL** (Windows Subsystem for Linux)

**Option 3: Manual copy method** (see Option B above)

**Option 4: Use DigitalOcean dashboard** (see Option C above)

---

## Security Best Practices

### 1. Use passphrase (optional but recommended)
```bash
# Generate key with passphrase
ssh-keygen -t ed25519 -C "your_email@example.com"
# Enter a strong passphrase when prompted
```

### 2. Disable password authentication on droplet
After SSH key is working:
```bash
ssh root@YOUR_DROPLET_IP

# Edit SSH config
nano /etc/ssh/sshd_config

# Change these lines:
# PasswordAuthentication no
# PermitRootLogin prohibit-password

# Restart SSH
systemctl restart sshd
```

### 3. Use a non-root user (advanced)
```bash
ssh root@YOUR_DROPLET_IP

# Create new user
adduser gameadmin
usermod -aG sudo gameadmin
usermod -aG docker gameadmin

# Copy SSH key to new user
rsync --archive --chown=gameadmin:gameadmin ~/.ssh /home/gameadmin

# Test new user
exit
ssh gameadmin@YOUR_DROPLET_IP

# Deploy with new user
export DROPLET_USER=gameadmin
export DROPLET_IP=your.droplet.ip.address
./deploy-digitalocean.sh
```

---

## Different SSH Key for Different Droplets

If you have multiple droplets, you can use `~/.ssh/config`:

```bash
# Edit SSH config
nano ~/.ssh/config

# Add entries for each droplet
Host agar-prod
  HostName 159.89.123.45
  User root
  IdentityFile ~/.ssh/id_ed25519

Host agar-dev
  HostName 159.89.123.46
  User root
  IdentityFile ~/.ssh/id_ed25519

# Now you can SSH with friendly names
ssh agar-prod
ssh agar-dev

# Deploy with friendly names
export DROPLET_IP=agar-prod
./deploy-digitalocean.sh
```

---

## Quick Reference

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy key to server
ssh-copy-id root@YOUR_DROPLET_IP

# Test connection
ssh root@YOUR_DROPLET_IP

# View your public key
cat ~/.ssh/id_ed25519.pub

# List all your keys
ls -la ~/.ssh/

# Add key to DigitalOcean account
# https://cloud.digitalocean.com/account/security
```

---

## Still Using Passwords?

If you absolutely must use password authentication (not recommended):

The script will still work, but you'll need to enter your password **5-7 times** during deployment:
1. Sync files
2. Copy .env file
3. Install Docker
4. Build containers
5. Check logs
6. Various other commands

**Better solution:** Take 2 minutes to setup SSH keys! 🔑

---

## More Information

- SSH Key Guide: https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys-2
- SSH Security: https://www.digitalocean.com/community/tutorials/ssh-essentials-working-with-ssh-servers-clients-and-keys
- DigitalOcean SSH Docs: https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/

---

**Once setup, you'll never type a password again!** 🎉

