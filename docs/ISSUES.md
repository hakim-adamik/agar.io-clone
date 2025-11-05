# Known Issues & Troubleshooting

## Player Spawn Limit Issue

### Issue Description
When attempting to spawn multiple bot players (or connect many clients), the server appears to have a soft limit of approximately 10 concurrent players when using the `farthest` spawn position mode.

### Root Cause Analysis
After investigating the codebase, the issue is **not** due to a hardcoded player limit. Instead, it's caused by the spawn position algorithm:

1. **The `newPlayerInitialPosition: "farthest"` setting** in `config.js` uses a uniform distribution algorithm that attempts to place new players as far as possible from existing players
2. **Algorithm limitation**: With many players, the algorithm struggles to find suitable spawn positions, effectively creating a soft cap on concurrent players
3. **No explicit limit**: The code doesn't enforce any maximum player count - connections are accepted until the spawn algorithm fails or system resources are exhausted

### Steps to Reproduce
1. Start the agar.io server with default configuration
2. Attempt to connect more than 10 clients (either bots or browser clients)
3. Observe that additional players beyond ~10 fail to spawn properly

### Tested With
- Bot script attempting to spawn 20+ automated players
- Multiple browser clients connecting simultaneously

### Proposed Solution
Change the spawn mode in `config.js` from:
```javascript
newPlayerInitialPosition: "farthest",
```
To:
```javascript
newPlayerInitialPosition: "random",
```

This switches from the uniform distribution "farthest" algorithm to random spawning, which should allow many more concurrent players.

### Alternative Solutions
1. Improve the `uniformPosition` algorithm in `src/server/lib/util.js` to handle high player density better
2. Add a fallback mechanism that switches to random spawning when the farthest algorithm fails
3. Make the spawn algorithm configurable with a timeout/retry limit

### Impact
- This limitation affects stress testing with bot players
- Prevents hosting games with many concurrent players
- May cause connection issues in production environments with high player counts

### Environment
- Node.js version: 14+
- Repository: Latest version from master branch
- Configuration: Default `config.js` settings

---

## Google Cloud Run Deployment Issues

### Container Failed to Start

**Symptoms:**
- Container fails to start and listen on port 8080
- Health check timeout errors
- "Ready condition status changed to False" errors

**Root Cause:**
- Port configuration mismatch (app configured for 3000, Cloud Run expects 8080)
- Missing production start script
- Build/runtime path issues

**Solutions:**
1. **Port Configuration Fixed:**
   - Updated `config.js` to use port 8080 as default
   - Modified Dockerfile to expose port 8080
   - Added `PORT=8080` environment variable

2. **Production Start Script:**
   - Added `start:prod` script to package.json
   - Updated Dockerfile to use production start command
   - Ensured built files are used in production

3. **Health Check Configuration:**
   - Updated health check to use correct port
   - Added proper app.yaml configuration for Cloud Run

---

## Common Issues & Solutions

### "Cannot connect to server"

**Symptoms:**
- Client fails to establish WebSocket connection
- Connection timeout errors

**Solutions:**
1. Check if the correct port is being used (8080 for production, 3000 for development)
2. Verify firewall settings
3. Ensure `npm install` completed successfully
4. Check server logs for errors
5. For Cloud Run: Verify the service is properly deployed and healthy

### Laggy gameplay

**Symptoms:**
- Choppy movement
- Delayed responses to input
- Poor frame rate

**Solutions:**
1. Check `networkUpdateFactor` in config.js (default: 60)
2. Monitor server CPU/memory usage
3. Verify client FPS in browser DevTools
4. Consider reducing entity counts in config
5. For Cloud Run: Check if CPU/memory limits are sufficient

### Build failures

**Symptoms:**
- npm start fails
- Compilation errors
- Missing dependencies

**Solutions:**
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Check Node.js version compatibility (v14+ required)
3. Verify all dev dependencies installed
4. Check for conflicting global packages
5. Run `npm run build` to ensure build process works

### Authentication Issues

**Symptoms:**
- Privy login fails
- User session not persisting
- Profile data not loading

**Solutions:**
1. Check Privy app configuration and API keys
2. Verify environment variables are set correctly
3. Clear browser cache and cookies
4. Check network connectivity for auth providers
5. Verify Privy SDK version compatibility

### Socket.io Connection Issues

**Symptoms:**
- Frequent disconnections
- "Transport close" errors
- Players unable to join game

**Solutions:**
1. Check WebSocket support in deployment environment
2. Verify proxy/load balancer configuration
3. Check for firewall blocking WebSocket connections
4. Monitor network latency and stability
5. For Cloud Run: Ensure WebSocket support is enabled

---

## Debugging Tips

### Useful Commands

```bash
# Monitor server logs
npm start | grep -E "(ERROR|WARNING)"

# Check for memory leaks
node --inspect bin/server/server.js

# Profile client performance
# Open Chrome DevTools > Performance tab

# Test with multiple clients
# Open multiple browser tabs/windows

# Build and test locally before deploying
npm run build
npm run start:prod
```

### Performance Monitoring

1. **Client-side:**
   - Use Chrome DevTools Performance tab
   - Monitor FPS counter
   - Check memory usage over time
   - Network tab for bandwidth usage

2. **Server-side:**
   - Monitor CPU and memory usage
   - Check active connection count
   - Log entity counts (food, players, viruses)
   - Monitor database query performance

3. **Cloud Run specific:**
   - Check Cloud Run metrics in Google Cloud Console
   - Monitor request latency and error rates
   - Verify auto-scaling behavior
   - Check container startup time

### Common Error Patterns

1. **Socket.io connection drops:**
   - Usually network-related
   - Check for proxy/firewall interference
   - Monitor heartbeat/ping responses

2. **Game state desync:**
   - Client prediction vs server authority conflicts
   - Check for rapid input changes
   - Monitor network latency

3. **Memory leaks:**
   - Accumulating entities not being cleaned up
   - Event listeners not being removed
   - Check player disconnect handling

4. **Cloud Run specific errors:**
   - Port binding issues (ensure PORT environment variable is used)
   - Container timeout (check startup time)
   - Resource limits exceeded (CPU/memory)

---

## Deployment Checklist

### Before Deploying to Cloud Run

1. **Configuration:**
   - [ ] Port set to 8080 or uses PORT environment variable
   - [ ] All environment variables configured
   - [ ] Database connections configured for production

2. **Build Process:**
   - [ ] `npm run build` completes successfully
   - [ ] All assets are built and available
   - [ ] Production dependencies installed

3. **Testing:**
   - [ ] Test locally with `npm run start:prod`
   - [ ] Verify port 8080 works locally
   - [ ] Check all game features work in production mode

4. **Docker:**
   - [ ] Dockerfile builds successfully
   - [ ] Container starts and listens on correct port
   - [ ] Health check passes

### After Deployment

1. **Verification:**
   - [ ] Service is healthy in Cloud Run console
   - [ ] Application loads correctly
   - [ ] WebSocket connections work
   - [ ] All game features functional

2. **Monitoring:**
   - [ ] Set up logging and monitoring
   - [ ] Configure alerts for errors
   - [ ] Monitor resource usage
   - [ ] Check auto-scaling behavior

---

## Reporting New Issues

When reporting issues, please include:

1. **Environment:**
   - Node.js version
   - Browser version (for client issues)
   - Operating system
   - Deployment platform (local, Cloud Run, etc.)

2. **Steps to reproduce:**
   - Detailed step-by-step instructions
   - Expected vs actual behavior
   - Screenshots/videos if applicable

3. **Logs:**
   - Server console output
   - Browser console errors
   - Network request failures
   - Cloud Run logs (if applicable)

4. **Configuration:**
   - Any custom config.js changes
   - Environment variables
   - Development vs production mode
   - Docker/deployment configuration
