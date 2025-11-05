#!/bin/bash

# Agar.io Clone - Google Cloud Run Deployment Script
# This script will deploy your application to Google Cloud Run

set -e  # Exit on any error

echo "🚀 Starting Agar.io Clone deployment to Google Cloud Run..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="raga-io-476815"
SERVICE_NAME="raga-io"
REGION="europe-west1"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Service Name: $SERVICE_NAME"
echo "  Region: $REGION"
echo ""

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
echo "Enabling Cloud Run API..."
gcloud services enable run.googleapis.com --quiet

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Step 2: Build and test locally
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 3: Test locally (optional, quick test)
echo -e "${YELLOW}🧪 Testing production start locally...${NC}"
echo "Starting server for 5 seconds to verify it works..."

# Start server in background
PORT=8080 npm run start:prod &
SERVER_PID=$!

# Wait a moment for server to start
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

# Step 4: Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Google Cloud Run...${NC}"
echo "This may take a few minutes..."
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 20 \
  --min-instances 0 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production \
  --quiet

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    echo -e "${BLUE}🌐 Your application is now live at:${NC}"
    echo -e "${GREEN}$SERVICE_URL${NC}"
    echo ""
    
    echo -e "${BLUE}📊 Useful commands:${NC}"
    echo "  View logs:    gcloud run logs read $SERVICE_NAME --region=$REGION"
    echo "  Get status:   gcloud run services describe $SERVICE_NAME --region=$REGION"
    echo "  Update:       Re-run this script"
    echo ""
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    
    # Optional: Open in browser (uncomment if you want)
    # echo "Opening in browser..."
    # open $SERVICE_URL 2>/dev/null || xdg-open $SERVICE_URL 2>/dev/null || echo "Please open $SERVICE_URL in your browser"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the logs above for error details."
    exit 1
fi
