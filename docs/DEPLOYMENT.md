# Deployment Guide

## Google Cloud Run Deployment

### Prerequisites

1. **Google Cloud CLI installed and configured:**

    ```bash
    gcloud auth login
    gcloud config set project YOUR_PROJECT_ID
    ```

2. **Docker installed** (for local testing - optional, handled by Cloud Run)

### Automated Deployment Script

The project includes a `deploy.sh` script that automates the entire deployment process. This is the **recommended approach** for most users.

### Quick Deployment (Automated Script - Recommended)

We've included an automated deployment script that handles everything for you:

```bash
# One-command deployment (recommended)
./deploy.sh
```

**What the script does:**

-   ✅ Checks prerequisites (gcloud CLI, authentication)
-   ✅ Builds the application (`npm run build`)
-   ✅ Tests locally to verify it works
-   ✅ Deploys to Google Cloud Run with optimal settings
-   ✅ Provides the live URL and useful commands

### Manual Deployment (Alternative)

If you prefer to run commands manually:

```bash
# Deploy directly from source
gcloud run deploy raga-io \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 20 \
  --set-env-vars NODE_ENV=production
```

### Step-by-Step Deployment

1. **Build and Test Locally:**

    ```bash
    # Build the application
    npm run build

    # Test production start locally
    PORT=8080 npm run start:prod

    # Verify it works at http://localhost:8080
    ```

2. **Test Docker Build Locally:**

    ```bash
    # Build Docker image
    docker build -t agar-io-clone .

    # Run container locally
    docker run -p 8080:8080 -e PORT=8080 agar-io-clone

    # Verify it works at http://localhost:8080
    ```

3. **Deploy to Cloud Run:**
    ```bash
    # Deploy from current directory
    gcloud run deploy raga-io \
      --source . \
      --platform managed \
      --region europe-west1 \
      --allow-unauthenticated \
      --port 8080 \
      --memory 512Mi \
      --cpu 1 \
      --max-instances 20 \
      --timeout 300 \
      --set-env-vars NODE_ENV=production,PORT=8080
    ```

### Configuration Options

#### Resource Limits

```bash
# Adjust based on your needs
--memory 512Mi        # Memory allocation
--cpu 1              # CPU allocation
--max-instances 20   # Auto-scaling limit
--min-instances 0    # Minimum instances (0 for cost optimization)
--timeout 300        # Request timeout in seconds
```

#### Environment Variables

```bash
--set-env-vars NODE_ENV=production,PORT=8080,ADMIN_PASS=your_secure_password
```

#### Custom Domain

```bash
# Map custom domain after deployment
gcloud run domain-mappings create \
  --service raga-io \
  --domain your-domain.com \
  --region europe-west1
```

### Monitoring & Troubleshooting

#### Check Service Status

```bash
# List all Cloud Run services
gcloud run services list

# Get service details
gcloud run services describe raga-io --region europe-west1

# View recent logs
gcloud run logs read raga-io --region europe-west1 --limit 50
```

#### Common Issues & Solutions

1. **Using the deploy.sh script (Recommended):**

    - The `deploy.sh` script handles most common issues automatically
    - If deployment fails, the script provides clear error messages
    - Run `./deploy.sh` again after fixing any prerequisites

2. **Container failed to start:**

    - Check logs: `gcloud run logs read raga-io --region europe-west1`
    - Verify port configuration (should be 8080)
    - Test Docker image locally first

3. **Health check failures:**

    - Ensure app responds to HTTP requests on PORT
    - Check startup time (increase timeout if needed)
    - Verify all dependencies are installed

4. **WebSocket connection issues:**
    - Cloud Run supports WebSockets by default
    - Check client connection URLs
    - Verify no proxy/firewall blocking connections

#### Performance Monitoring

```bash
# View metrics in Cloud Console
gcloud run services describe raga-io --region europe-west1 --format="get(status.url)"

# Set up alerts
gcloud alpha monitoring policies create --policy-from-file=monitoring-policy.yaml
```

---

## Alternative Deployment Options

### Heroku Deployment

1. **Using Heroku Button (Easiest):**

    - Click "Deploy to Heroku" button in README
    - Configure environment variables
    - Deploy automatically

2. **Manual Heroku Deployment:**

    ```bash
    # Install Heroku CLI and login
    heroku login

    # Create app
    heroku create your-app-name

    # Set environment variables
    heroku config:set NODE_ENV=production
    heroku config:set PORT=8080

    # Deploy
    git push heroku main
    ```

### Docker Deployment

1. **Build Image:**

    ```bash
    docker build -t agar-io-clone .
    ```

2. **Run Container:**

    ```bash
    docker run -d \
      -p 8080:8080 \
      -e NODE_ENV=production \
      -e PORT=8080 \
      --name agar-game \
      agar-io-clone
    ```

3. **Docker Compose:**
    ```yaml
    # docker-compose.yml
    version: "3.8"
    services:
        agar-game:
            build: .
            ports:
                - "8080:8080"
            environment:
                - NODE_ENV=production
                - PORT=8080
            restart: unless-stopped
    ```

### VPS/Server Deployment

1. **Install Dependencies:**

    ```bash
    # On Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install PM2 for process management
    npm install -g pm2
    ```

2. **Deploy Application:**

    ```bash
    # Clone repository
    git clone https://github.com/your-username/agar-io-clone.git
    cd agar-io-clone

    # Install dependencies and build
    npm install
    npm run build

    # Start with PM2
    pm2 start ecosystem.config.js

    # Save PM2 configuration
    pm2 save
    pm2 startup
    ```

3. **Nginx Configuration:**
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

---

## Environment Configuration

### Required Environment Variables

```bash
PORT=8080                    # Server port (required for Cloud Run)
NODE_ENV=production         # Environment mode
```

### Optional Environment Variables

```bash
ADMIN_PASS=secure_password  # Admin password for server management
PRIVY_APP_ID=your_app_id   # Privy authentication app ID
```

### Production Configuration

Update `config.js` for production:

```javascript
module.exports = {
    host: "0.0.0.0",
    port: process.env.PORT || 8080,
    adminPass: process.env.ADMIN_PASS || "CHANGE_THIS_IN_PRODUCTION",

    // Database configuration for production
    sqlinfo: {
        fileName: process.env.DATABASE_URL || "db.sqlite3",
    },

    // Performance optimizations for production
    networkUpdateFactor: 60,
    maxFood: 1000,
    maxVirus: 50,
};
```

---

## Security Considerations

### Production Checklist

-   [ ] Change default admin password
-   [ ] Use HTTPS (handled by Cloud Run automatically)
-   [ ] Configure proper CORS if needed
-   [ ] Set up monitoring and logging
-   [ ] Configure rate limiting if necessary
-   [ ] Secure database connections
-   [ ] Use environment variables for sensitive data

### Monitoring Setup

1. **Cloud Run Monitoring:**

    - Enable Cloud Monitoring
    - Set up alerts for errors and latency
    - Monitor resource usage

2. **Application Logging:**

    ```javascript
    // Add structured logging
    console.log(
        JSON.stringify({
            level: "info",
            message: "Player connected",
            playerId: player.id,
            timestamp: new Date().toISOString(),
        })
    );
    ```

3. **Error Tracking:**
    - Consider integrating Sentry or similar
    - Set up error alerts
    - Monitor WebSocket connection stability

---

## Scaling Considerations

### Auto-scaling Configuration

```bash
# Configure auto-scaling
gcloud run services update raga-io \
  --min-instances 1 \
  --max-instances 50 \
  --concurrency 80 \
  --cpu-throttling \
  --region europe-west1
```

### Performance Optimization

1. **Resource Allocation:**

    - Monitor CPU/memory usage
    - Adjust limits based on load
    - Consider using multiple instances

2. **Database Optimization:**

    - Use connection pooling
    - Consider external database for persistence
    - Implement caching for frequently accessed data

3. **WebSocket Optimization:**
    - Monitor concurrent connections
    - Implement connection limits if needed
    - Consider using Redis for session storage

---

## Backup & Recovery

### Database Backup

```bash
# For SQLite (development)
cp db.sqlite3 backups/db_$(date +%Y%m%d_%H%M%S).sqlite3

# For production database
# Set up automated backups through your cloud provider
```

### Configuration Backup

```bash
# Backup environment variables
gcloud run services describe raga-io --region europe-west1 --format="export" > service-config-backup.yaml
```

### Disaster Recovery

1. Keep source code in version control (GitHub)
2. Document all environment variables
3. Maintain infrastructure as code
4. Test deployment process regularly
5. Have rollback plan ready

---

## Cost Optimization

### Cloud Run Cost Tips

1. **Use minimum instances wisely:**

    - Set to 0 for cost savings
    - Set to 1+ for faster response times

2. **Monitor usage:**

    - Track request counts and duration
    - Optimize resource allocation
    - Use Cloud Monitoring for insights

3. **Regional selection:**
    - Choose region closest to users
    - Consider pricing differences between regions

### Resource Optimization

```javascript
// Optimize game configuration for cost
module.exports = {
    maxFood: 500, // Reduce entity count
    maxVirus: 25, // Fewer viruses
    networkUpdateFactor: 40, // Lower update frequency
    maxHeartbeatInterval: 10000, // Longer heartbeat interval
};
```
