# Preview Deployments Guide

## Overview

Preview deployments allow you to test branches in a Google Cloud Run environment before merging to production. This helps catch deployment-specific issues that may not appear in local development.

## Why Preview Deployments?

- **Test in production-like environment** - Same infrastructure as production
- **Catch deployment issues early** - Identify Cloud Run-specific problems
- **Branch-based URLs** - Each branch gets its own URL
- **Isolated testing** - No impact on production
- **Share with stakeholders** - Get feedback before merging

## Quick Start

### Deploy Current Branch to Preview

```bash
./deploy-preview.sh
```

This will:
1. Build your application
2. Deploy to a branch-specific Cloud Run service
3. Generate a unique preview URL like: `https://preview-feature-multi-arena-[hash].europe-west1.run.app`

### Production Deployment

```bash
./deploy.sh
```

Production URL: `https://raga-io-268288684655.europe-west1.run.app/`

## Scripts Overview

### `deploy-preview.sh`
- **Purpose**: Deploy current branch to preview environment
- **Service Name**: `preview-[branch-name]`
- **Max Instances**: 5 (vs 20 for production)
- **Auto-cleanup**: No (manual cleanup required)

### `deploy.sh`
- **Purpose**: Deploy to production
- **Service Name**: `raga-io`
- **Max Instances**: 20
- **URL**: Fixed production URL

### `cleanup-previews.sh`
- **Purpose**: Manage and delete preview deployments
- **Features**:
  - List all preview deployments
  - Delete specific previews
  - Delete old previews (by age)
  - Interactive or command-line usage

## Preview Deployment Process

### 1. Create/Checkout Your Branch
```bash
git checkout -b feature/your-feature
```

### 2. Make Your Changes
Develop and test locally as usual.

### 3. Deploy to Preview
```bash
./deploy-preview.sh
```

**Output Example:**
```
🔮 Starting Agar.io Clone PREVIEW deployment...
📋 Configuration:
  Git Branch: feature/multi-arena
  Service Name: preview-feature-multi-arena
  Commit: abc123f

🚀 Deploying PREVIEW to Google Cloud Run...
🎉 Preview deployment successful!

🌐 Your PREVIEW is now live at:
https://preview-feature-multi-arena-abc123f.europe-west1.run.app

📊 Environment URLs:
  Preview:    https://preview-feature-multi-arena-abc123f.europe-west1.run.app
  Production: https://raga-io-268288684655.europe-west1.run.app/
```

### 4. Test Your Preview
- Visit the preview URL
- Test functionality
- Compare with production
- Share URL for feedback

### 5. Clean Up After Testing
```bash
# Interactive mode
./cleanup-previews.sh

# Or command-line
./cleanup-previews.sh --delete preview-feature-multi-arena
```

## Managing Preview Environments

### List All Previews
```bash
./cleanup-previews.sh --list
# Or
gcloud run services list --region=europe-west1 --filter="metadata.name:preview-*"
```

### Delete Old Previews (7+ days)
```bash
./cleanup-previews.sh --delete-old 7
```

### Delete Specific Preview
```bash
./cleanup-previews.sh --delete preview-feature-multi-arena
```

### View Preview Logs
```bash
gcloud run logs read preview-feature-multi-arena --region=europe-west1
```

## Environment Variables

Both preview and production deployments use:
- `NODE_ENV=production`
- `PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i`

Preview deployments additionally have:
- `DEPLOYMENT_TYPE=preview`
- `GIT_BRANCH=[branch-name]`
- `GIT_COMMIT=[commit-hash]`

## Branch Naming Conventions

Branch names are sanitized for Cloud Run service names:
- Special characters → hyphens
- Uppercase → lowercase
- Max 50 characters
- Prefix: `preview-`

**Examples:**
- `feature/multi-arena` → `preview-feature-multi-arena`
- `fix/auth-bug` → `preview-fix-auth-bug`
- `USER-123/new_feature` → `preview-user-123-new-feature`

## Cost Considerations

**Preview deployments cost money!**

- Each preview is a separate Cloud Run service
- Minimum instances: 0 (scales to zero when idle)
- Maximum instances: 5 (vs 20 for production)
- **Important**: Delete previews when done testing

### Cost-Saving Tips
1. Use `cleanup-previews.sh` regularly
2. Set calendar reminders to clean up old previews
3. Preview services scale to zero when idle
4. Use `--delete-old` to remove forgotten previews

## Common Issues and Solutions

### Issue: Build differences between local and Cloud Run

**Symptoms:**
- Works locally but not in Cloud Run
- Different behavior in preview vs local

**Solutions:**
1. Check Dockerfile for build differences
2. Verify environment variables
3. Check `build-webpack.js` execution
4. Review Cloud Build logs:
   ```bash
   gcloud run logs read preview-[branch-name] --region=europe-west1
   ```

### Issue: Preview URL not working

**Solutions:**
1. Check deployment status:
   ```bash
   gcloud run services describe preview-[branch-name] --region=europe-west1
   ```
2. Verify authentication is disabled (--allow-unauthenticated)
3. Check service logs for errors

### Issue: Too many preview deployments

**Solutions:**
1. Regular cleanup:
   ```bash
   ./cleanup-previews.sh --delete-old 3
   ```
2. List and review all previews:
   ```bash
   ./cleanup-previews.sh --list
   ```

## Best Practices

1. **Always test in preview before production**
   - Especially for build/deployment changes
   - When modifying webpack or gulp configs

2. **Clean up after yourself**
   - Delete preview after PR is merged
   - Use cleanup script weekly

3. **Use meaningful branch names**
   - They become part of the preview URL
   - Help identify previews later

4. **Document preview URLs in PRs**
   - Add preview URL to PR description
   - Makes testing easier for reviewers

5. **Monitor costs**
   - Check Cloud Run billing regularly
   - Set up budget alerts in Google Cloud Console

## Advanced Usage

### Custom Configuration

Modify `deploy-preview.sh` for different settings:
```bash
# Change memory/CPU
--memory 1Gi \
--cpu 2 \

# Change scaling
--max-instances 10 \
--min-instances 1 \
```

### Automated PR Previews

Consider setting up GitHub Actions to:
1. Auto-deploy on PR creation
2. Comment preview URL on PR
3. Auto-cleanup on PR merge

### Multiple Preview Environments

You can have multiple previews for the same branch:
```bash
# Manually specify service name
SERVICE_NAME="preview-experiment-1" ./deploy-preview.sh
SERVICE_NAME="preview-experiment-2" ./deploy-preview.sh
```

## Security Considerations

- Preview deployments are **publicly accessible**
- Don't deploy sensitive branches to preview
- Use different API keys for preview if needed
- Consider adding basic auth for sensitive previews

## Troubleshooting Commands

```bash
# View all Cloud Run services
gcloud run services list --region=europe-west1

# Check preview service status
gcloud run services describe preview-[branch-name] --region=europe-west1

# View recent logs
gcloud run logs read preview-[branch-name] --region=europe-west1 --limit=50

# Check deployment history
gcloud run revisions list --service=preview-[branch-name] --region=europe-west1

# Force delete a stuck service
gcloud run services delete preview-[branch-name] --region=europe-west1 --quiet
```

## Summary

Preview deployments provide a powerful way to test branches in a production-like environment. Use `deploy-preview.sh` to create previews, test thoroughly, and always clean up with `cleanup-previews.sh` when done.

**Remember:** Preview deployments = Real infrastructure = Real costs. Clean up when done!