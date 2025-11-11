#!/bin/bash

# Agar.io Clone - Google Cloud Run Preview Deployment Script
# This script deploys the current branch to a preview environment on Google Cloud Run

set -e  # Exit on any error

echo "🔮 Starting Agar.io Clone PREVIEW deployment to Google Cloud Run..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="raga-io-476815"
REGION="europe-west1"

# Get current git branch name and sanitize it for Cloud Run service name
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# Replace special characters with hyphens and convert to lowercase
SANITIZED_BRANCH=$(echo "$GIT_BRANCH" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]' | sed 's/^-//;s/-$//')
# Truncate to 50 chars (Cloud Run service name limit is 63, we need room for prefix)
SANITIZED_BRANCH=${SANITIZED_BRANCH:0:50}

# Service name for preview (prefix with 'preview-')
SERVICE_NAME="preview-${SANITIZED_BRANCH}"

# Get short commit hash for version tracking
COMMIT_HASH=$(git rev-parse --short HEAD)

echo -e "${PURPLE}🌟 PREVIEW DEPLOYMENT${NC}"
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Git Branch: $GIT_BRANCH"
echo "  Service Name: $SERVICE_NAME"
echo "  Commit: $COMMIT_HASH"
echo "  Region: $REGION"
echo ""

# Warning for main/master branches
if [[ "$GIT_BRANCH" == "master" ]] || [[ "$GIT_BRANCH" == "main" ]]; then
    echo -e "${YELLOW}⚠️  WARNING: You're on the $GIT_BRANCH branch!${NC}"
    echo "For production deployment, use ./deploy.sh instead."
    echo "This will create a preview at: preview-$SANITIZED_BRANCH"
    read -p "Continue with preview deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Step 1: Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Ensuring Cloud Run API is enabled..."
gcloud services enable run.googleapis.com --quiet

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Step 2: Check for uncommitted changes
echo -e "${YELLOW}🔍 Checking for uncommitted changes...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status -s
    echo ""
    read -p "Deploy anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first."
        exit 1
    fi
fi

# Step 3: Build and test locally
echo -e "${YELLOW}🔨 Building application...${NC}"
echo "Running build stages:"
echo "  1. gulp build - Server code + static files"
echo "  2. webpack bundles will be built during Docker deployment"
echo ""
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 4: Quick local test
echo -e "${YELLOW}🧪 Quick local test...${NC}"
echo "Starting server for 5 seconds to verify it works..."

# Start server in background
PORT=8080 npm run start:prod &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test if server is responding
if curl -s -f http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✅ Local test successful${NC}"
else
    echo -e "${YELLOW}⚠️  Local test inconclusive (server might need more time)${NC}"
fi

# Kill the test server
kill $SERVER_PID 2>/dev/null || true
sleep 1

echo ""

# Step 5: Deploy to Cloud Run as preview
echo -e "${PURPLE}🚀 Deploying PREVIEW to Google Cloud Run...${NC}"
echo "Creating preview environment: $SERVICE_NAME"
echo "This may take a few minutes..."
echo ""

# Add labels for tracking
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --min-instances 0 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production,PRIVY_APP_ID=cmhkpg56r02vbjr0cdeex8n7i,DEPLOYMENT_TYPE=preview,GIT_BRANCH=$GIT_BRANCH,GIT_COMMIT=$COMMIT_HASH,DATABASE_URL="postgresql://neondb_owner:npg_X0hNZFwe8Lrk@ep-wild-bar-agks6pgk-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  --labels environment=preview,branch=$SANITIZED_BRANCH,commit=$COMMIT_HASH \
  --quiet

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Preview deployment successful!${NC}"
    echo ""

    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

    echo -e "${PURPLE}🌐 Your PREVIEW is now live at:${NC}"
    echo -e "${GREEN}$SERVICE_URL${NC}"
    echo ""

    # Show production URL for comparison
    PROD_URL=$(gcloud run services describe raga-io --region=$REGION --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    echo -e "${BLUE}📊 Environment URLs:${NC}"
    echo "  Preview:    $SERVICE_URL"
    echo "  Production: $PROD_URL"
    echo ""

    echo -e "${BLUE}📋 Preview Management Commands:${NC}"
    echo "  View logs:    gcloud run logs read $SERVICE_NAME --region=$REGION"
    echo "  Get status:   gcloud run services describe $SERVICE_NAME --region=$REGION"
    echo "  Update:       Re-run this script"
    echo "  Delete:       gcloud run services delete $SERVICE_NAME --region=$REGION"
    echo ""

    echo -e "${YELLOW}⏰ Preview Lifetime:${NC}"
    echo "  This preview will remain active until manually deleted."
    echo "  Remember to delete it when no longer needed to save resources:"
    echo "  ${BLUE}gcloud run services delete $SERVICE_NAME --region=$REGION${NC}"
    echo ""

    # List all preview deployments
    echo -e "${BLUE}📝 All Preview Deployments:${NC}"
    gcloud run services list --region=$REGION --filter="metadata.labels.environment=preview" --format="table(SERVICE,metadata.labels.branch,LAST_DEPLOYED,URL)" 2>/dev/null || echo "  None found"
    echo ""

    echo -e "${GREEN}✅ Preview deployment completed successfully!${NC}"
    echo -e "${PURPLE}🔗 Preview URL: $SERVICE_URL${NC}"

    # Optional: Copy URL to clipboard (macOS)
    if command -v pbcopy &> /dev/null; then
        echo "$SERVICE_URL" | pbcopy
        echo -e "${GREEN}📋 URL copied to clipboard!${NC}"
    fi

else
    echo -e "${RED}❌ Preview deployment failed${NC}"
    echo "Check the logs above for error details."
    exit 1
fi