#!/bin/bash

# Database Environment Check Script
# Helps verify which database environment is being used

echo "🔍 Database Environment Check"
echo "=============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "💡 Copy .env.example to .env and configure your databases"
    exit 1
fi

# Source the .env file (safely)
set -a
source .env
set +a

echo ""
echo "📊 Current Configuration:"

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
    echo "✅ Local Development: SQLite database"
    echo "   File: src/server/db/db.sqlite3"
    echo "   Status: Zero configuration, works offline"
else
    echo "🌐 Remote Database: PostgreSQL"

    # Check if it's production or preview
    if [[ "$POSTGRES_URL" == *"ep-tiny-night-ago05sk9"* ]]; then
        echo "   Environment: 🔴 PRODUCTION (agar-io-main)"
        echo "   ⚠️  WARNING: This affects live user data!"
    elif [[ "$POSTGRES_URL" == *"ep-wild-bar-agks6pgk"* ]]; then
        echo "   Environment: 🟡 PREVIEW (agar-io-preview)"
        echo "   ✅ Safe for testing"
    else
        echo "   Environment: ❓ Unknown database"
    fi

    echo "   Host: $(echo $POSTGRES_URL | sed 's/.*@//;s/\/.*//;s/:.*//;s/-pooler.*//')"
fi

echo ""
echo "💡 Quick Commands:"
echo "   Local SQLite:     npm start (no env vars needed)"
echo "   Preview Testing:  POSTGRES_URL=\"\$POSTGRES_URL_PREVIEW\" npm start"
echo "   Production Test:  POSTGRES_URL=\"\$POSTGRES_URL_PROD\" npm start"

echo ""
echo "🚀 Deployment Targets:"
echo "   Preview:     ./deploy-preview.sh  →  agar-io-preview DB"
echo "   Production:  ./deploy.sh          →  agar-io-main DB"