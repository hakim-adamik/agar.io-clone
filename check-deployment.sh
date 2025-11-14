#!/bin/bash

# Quick deployment check script
DROPLET_IP="${DROPLET_IP:-164.92.211.194}"
DROPLET_USER="${DROPLET_USER:-root}"

echo "🔍 Checking deployment at http://$DROPLET_IP:3000"
echo ""

# 1. Check if site is responding
echo "1. Testing HTTP response..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://$DROPLET_IP:3000/)
if [ "$response" = "200" ]; then
    echo "✅ Site is responding (HTTP $response)"
else
    echo "❌ Site not responding (HTTP $response)"
fi
echo ""

# 2. Check if Privy bundle exists
echo "2. Checking Privy bundle..."
bundle_response=$(curl -s -o /dev/null -w "%{http_code}" http://$DROPLET_IP:3000/auth/privy-auth-bundle.js)
if [ "$bundle_response" = "200" ]; then
    echo "✅ Privy bundle is accessible"
    # Check file size
    size=$(curl -sI http://$DROPLET_IP:3000/auth/privy-auth-bundle.js | grep -i content-length | awk '{print $2}' | tr -d '\r')
    echo "   Size: $size bytes"
else
    echo "❌ Privy bundle not found (HTTP $bundle_response)"
fi
echo ""

# 3. Check if PRIVY_APP_ID is injected
echo "3. Checking PRIVY_APP_ID injection..."
if curl -s http://$DROPLET_IP:3000/ | grep -q "PRIVY_APP_ID.*cmhkpg56r02vbjr0cdeex8n7i"; then
    echo "✅ PRIVY_APP_ID is injected in HTML"
else
    echo "❌ PRIVY_APP_ID not found in HTML"
fi
echo ""

# 4. Check for embedded wallet code
echo "4. Checking if embedded wallets are disabled..."
if curl -s http://$DROPLET_IP:3000/auth/privy-auth-bundle.js | grep -q "embeddedWallets.*createOnLogin"; then
    echo "⚠️  Embedded wallets code found (may not be disabled)"
else
    echo "✅ Embedded wallets appear to be disabled"
fi
echo ""

# 5. Check container logs for errors
echo "5. Recent container logs..."
ssh $DROPLET_USER@$DROPLET_IP "docker logs agar-game-server --tail 10 2>&1 | grep -E '(ERROR|error|Error|PRIVY|Privy)' || echo 'No errors in recent logs'"
echo ""

# 6. Test WebSocket connectivity
echo "6. Testing WebSocket endpoint..."
ws_test=$(curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://$DROPLET_IP:3000/socket.io/)
echo "   WebSocket test response: HTTP $ws_test"
echo ""

echo "📋 Summary:"
echo "- Visit http://$DROPLET_IP:3000 in your browser"
echo "- Open DevTools Console (F12)"
echo "- Try clicking 'Sign In with Privy'"
echo "- Check for any errors in the console"
echo ""
echo "If authentication still fails, the error messages in the browser console will help diagnose the issue."