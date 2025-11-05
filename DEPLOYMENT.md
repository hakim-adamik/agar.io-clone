# Deployment Guide

## Important: Full-Stack Application Requirements

This Agar.io clone is a **full-stack multiplayer game** that requires:
- A Node.js backend server for game logic
- WebSocket connections (Socket.io) for real-time multiplayer
- Persistent server state for game rooms

## Vercel Deployment (Static Assets Only)

**⚠️ Note:** Vercel can only deploy the client-side assets. The game will NOT be playable without a separate backend server.

The `vercel.json` configuration will:
1. Build the client assets using `npm run build`
2. Deploy the static files from `bin/client/`
3. Use `--legacy-peer-deps` to handle React version conflicts with Privy

### What Works on Vercel:
- ✅ Landing page and UI
- ✅ Authentication flow (Privy)
- ❌ Actual gameplay (requires backend server)

## Recommended Deployment Options

### For Full Functionality:

1. **Heroku** (Recommended)
   - Supports Node.js backend
   - WebSocket connections work
   - Use the "Deploy to Heroku" button in README

2. **DigitalOcean App Platform**
   - Full Node.js support
   - WebSocket compatible

3. **AWS EC2 / Google Cloud Compute**
   - Full control over server
   - Best for production scalability

4. **Railway.app**
   - Easy deployment from GitHub
   - WebSocket support

## Environment Variables

Required for all deployments:
```
PRIVY_APP_ID=your_privy_app_id
PORT=3000
```

## Build Commands

```bash
# Install dependencies (with legacy peer deps for React 19)
npm install --legacy-peer-deps

# Build client and server
npm run build

# Start the server (not available on Vercel)
npm start
```

## Why Vercel Doesn't Work for This Game

Vercel is designed for:
- Static sites
- Serverless functions (stateless)
- JAMstack applications

This game needs:
- Persistent WebSocket connections
- Stateful game rooms
- Real-time bidirectional communication
- Long-running Node.js process

Consider Vercel only for:
- Hosting documentation
- Landing page preview
- UI demonstrations