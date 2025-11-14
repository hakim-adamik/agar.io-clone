# Claude.md - LLM Context Document

## Agar.io Clone Development Status

### Project Overview

This is a functional Agar.io clone built with Node.js, Socket.io, and HTML5 Canvas. The project was originally created by @huytd and is now maintained by @owenashurst. The codebase is mature, stable, and actively maintained with recent performance optimizations.

---

## Current Development Status

### ✅ Completed Features

-   **Multi-Arena System:** Unlimited concurrent players with automatic arena creation (10 players per arena, 50 arenas max)
-   **Scalable Architecture:** Auto-scales from 1 to 500+ players with zero configuration
-   **Smart Player Distribution:** Automatic assignment to available arenas with respawn preferences
-   **Core Gameplay:** Fully functional multiplayer gameplay with all essential Agar.io mechanics
-   **Movement System:** Mouse-controlled cell movement with mass-based speed calculations
-   **Eating Mechanics:** Cell-to-cell consumption, food particles, mass ejection
-   **Split Mechanics:** Cell splitting with merge timer (15 seconds)
-   **Virus System:** Working virus entities that split larger cells
-   **Chat System:** In-game chat with command support (e.g., `-ping`, `-dark`)
-   **Spectator Mode:** Ability to watch games without participating
-   **Leaderboard:** Real-time top players display per arena with "Coming Soon" badge for global features
-   **Mobile Support:** Touch controls and responsive design
-   **Dark Mode:** Toggle via checkbox or chat command, changes background and grid colors
-   **Performance Optimizations:** Viewport culling, grid caching, socket throttling, per-arena game loops
-   **Seamless Game Experience:** Unified landing page and game in single index.html with instant play capability
-   **Auto Guest Names:** Automatically generates guest names (e.g., Guest_8209) for immediate gameplay
-   **Centralized Default Settings:** Configurable defaults in `game-config.js` (dark mode, mass display, borders, continuity enabled by default)
-   **Social Authentication:** Privy SDK integration for Google, Discord, Twitter, and Email login
-   **Guest Profile System:** Clear guest status indication with invitation to sign in for rewards
-   **Arena Monitoring:** GET /api/arenas endpoint for real-time server statistics
-   **Virtual Wallet System:** PostgreSQL-based wallet with $1 default balance for authenticated users
-   **Play Choice Modal:** Smart UX for unsigned users choosing between guest play vs sign-up for rewards

### 🚧 Next Steps & Roadmap

#### 🔐 Authentication & User System (Priority: High) - `user-data-clean` branch

**1. Database Integration (✅ Phase A Infrastructure Complete - November 2024)**
- [x] ~~Choose database system~~ → Using existing SQLite infrastructure
- [x] ~~Create user tables schema in sql.js~~
  - [x] Users table (id, privy_id, username, email, auth_provider, created_at, last_seen)
  - [x] Game statistics table (user_id, games_played, total_mass_eaten, high_score, etc.)
  - [x] User preferences table (dark_mode, show_mass, show_border, etc.)
  - [x] Game sessions table (id, user_id, arena_id, start_time, final_mass, etc.)
  - [x] Leaderboard table (user_id, score, username, achieved_at)
- [x] ~~Create repository layer for database operations~~
  - [x] UserRepository - User CRUD with Privy ID support
  - [x] StatsRepository - Game statistics management
  - [x] SessionRepository - Game session tracking
  - [x] PreferencesRepository - Settings persistence
- [x] ~~Create AuthService~~ - Orchestrates authentication and user data
- [x] ~~Add REST API endpoints~~
  - [x] POST /api/auth - Authenticate with Privy
  - [x] GET /api/user/:userId - Get user profile
  - [x] GET/PUT /api/user/:userId/preferences - Manage preferences
  - [x] GET /api/leaderboard - Get leaderboard data
  - [x] PUT /api/user/:userId/profile - Update profile
- [x] ~~Integrate Socket.IO with session tracking~~
  - [x] Pass userId via query params
  - [x] Start game sessions on connect
  - [x] End sessions with stats on disconnect

**2. Virtual Wallet System (✅ Complete - November 2024)**
- [x] ~~PostgreSQL wallet_balances table with DECIMAL(18,6) precision~~
- [x] ~~WalletRepository with full CRUD operations (add, subtract, transfer, stats)~~
- [x] ~~REST API endpoints for wallet management~~
- [x] ~~Frontend wallet balance display in user profile~~
- [x] ~~Smart add funds button (only active when balance < $1)~~
- [x] ~~$1.000000 default balance for new users~~

**3. Play Choice UX (✅ Complete - November 2024)**
- [x] ~~"Choose Your Adventure" modal for unsigned users~~
- [x] ~~Guest option: immediate free play with clear limitations~~
- [x] ~~Sign-up option: highlighting earning potential and competition~~
- [x] ~~Mobile-responsive design with proper button alignment~~
- [x] ~~Auto-redirect to game after successful authentication~~
- [x] ~~Engaging copy: "Are you bullish enough to dominate the arena?"~~

**4. Client Integration (Next Priority)**
- [ ] Update client to send userId with socket connection
- [ ] Call auth API after Privy login
- [ ] Replace mock profile data with real database queries
- [ ] Load/save user preferences from server
- [ ] Show real leaderboard data

#### 💰 Privy Wallet Integration (Priority: Medium)
- [ ] Enable embedded wallets in Privy config
- [ ] Display wallet address in profile
- [ ] Plan Web3 features (NFT achievements, tokenized rewards, cosmetics store)

#### 🎮 Enhanced Profile System (Priority: Medium)
- [ ] Replace mock data with real database queries
- [ ] Add profile customization (bio, region, preferred settings)
- [ ] Implement friends system and following features
- [ ] Create private rooms with password protection

#### 🏆 Achievement System (Priority: Low)
- [ ] Gameplay achievements (first kill, mass thresholds, survival time)
- [ ] Social achievements (playing with friends, follower milestones)
- [ ] Special badges and rewards

#### 🔧 Technical Improvements
**Backend Architecture:**
- [x] ~~RESTful API layer for user data~~ ✅ Implemented November 2024
- [ ] Redis caching for sessions and leaderboard
- [ ] Queue system for async stats processing

**Code Organization:**
- [ ] Break out GameControls into separate class (`src/client/js/app.js:96`)
- [ ] Refactor GameControls into separate modules (`src/client/js/chat-client.js:24`)

**Performance:**
- [ ] Consider WebGL rendering for better performance
- [ ] Implement replay system

**Security:**
- [ ] Rate limiting for API endpoints
- [ ] Input validation for user data
- [ ] Enhanced anti-cheat measures

### 📊 Recent Changes

-   **Latest Updates (November 2024):**
    -   **Database Infrastructure:** Phase A complete with SQLite tables, repository layer, and REST API
    -   **User Authentication:** Database integration with Privy auth IDs for persistent user profiles
    -   **Session Tracking:** Socket.IO integrated with game sessions for stats collection
    -   **REST API:** Complete API endpoints for auth, profiles, preferences, and leaderboard
    -   **Repository Pattern:** Clean data access layer with UserRepository, StatsRepository, SessionRepository, PreferencesRepository
    -   **Multi-Arena System:** Supports 500+ concurrent players across independent arenas (10 players each)
    -   **Scalable Architecture:** Auto-creates arenas on demand, cleans up empty arenas after 60s
    -   **Smart Player Assignment:** Players distributed to available arenas with respawn preferences
    -   **Arena Monitoring:** GET /api/arenas endpoint for real-time statistics
    -   **Authentication System:** Integrated Privy SDK for social login (Google, Discord, Twitter, Email)
    -   **Guest Profile Modal:** Improved guest experience with clear status and "Pro Tip" to encourage sign-in
    -   **Direct Auth Flow:** Removed redundant modals, clicking "Sign In" directly opens Privy authentication
    -   **Seamless Play Experience:** Merged landing page and game into unified index.html
    -   **Auto Guest Names:** Players can instantly join without entering a name
    -   **UI Improvements:** Professional landing page with animated background and modal system
    -   **CSS Architecture:** Scoped game styles to prevent conflicts with landing page
    -   **Grid Display Fix:** Grid now fixed in world space instead of moving with player
    -   **Dark Mode:** Added functional checkbox and chat command (`-dark`) support
    -   **Documentation:** Comprehensive multi-arena architecture, database design, deployment guides
    -   **Google Cloud Run Deployment:** Successfully deployed with automated `deploy.sh` script
    -   **Runtime Environment Injection:** Server-side HTML injection for environment variables (Privy App ID)
    -   **Webpack Build System:** Custom `build-webpack.js` script for Docker/Cloud Build compatibility
-   **Performance Update:**
    -   Implemented viewport culling (50-80% reduction in draw calls)
    -   Added grid caching (eliminates 50-100 line draws per frame)
    -   Socket emission throttling (60% network overhead reduction)
    -   Optimized cell border rendering (30-50% fewer calculations)
    -   Network update rate increased to 60Hz for smoother gameplay

---

## Bot Players System

A separate **bots** repository is available that provides AI-controlled bot players for testing and gameplay:

### Bot Features

-   **Multiple AI Behaviors:** Aggressive, Defensive, Wanderer, and Smart adaptive strategies
-   **Autonomous Gameplay:** Bots can move, eat, split, and eject mass
-   **Configurable:** Spawn multiple bots with custom parameters
-   **Easy Setup:** Simple command-line interface

### Running Bots

```bash
# From the bots repository
cd /Users/fabricedautriat/Documents/GitHub/bots

# Spawn default 3 bots
npm start

# Spawn specific number of bots
node bot-players.js --bots 20

# Use predefined configurations
npm run bots:few    # 5 bots
npm run bots:many   # 20 bots
npm run bots:stress # 50 bots with fast spawning
```

### Bot Limitations (Resolved with Multi-Arena)

-   ✅ **Multi-arena system** - Supports 500+ concurrent players (50 arenas × 10 players)
-   ✅ **10 players per arena** - "Farthest" spawn algorithm works perfectly within arena capacity
-   ✅ **Auto-scaling** - New arenas created automatically when existing arenas reach capacity
-   ✅ **Tested:** 100 bots across 10 arenas with zero spawn failures

---

## Quick Start for Development

### Prerequisites

```bash
# Ensure Node.js and npm are installed
node --version  # Should be v14+
npm --version   # Should be v6+
```

### Setup

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run watch

# Production build and run
npm start

# Run tests
npm test
```

### Key Files for New Features

1. **Adding new game mechanics:**

    - Server logic: `src/server/game-logic.js`
    - Player mechanics: `src/server/map/player.js`
    - Client rendering: `src/client/js/render.js`

2. **Modifying game balance:**

    - Configuration: `config.js`
    - Key parameters: `defaultPlayerMass`, `foodMass`, `slowBase`, `massLossRate`

3. **Default Game Settings:**

    - **Configuration:** `src/client/js/game-config.js`
    - **Current Defaults:**
        - Dark mode: `true` (black background)
        - Show mass: `true` (display cell mass values)
        - Show border: `true` (game area boundaries)
        - Continuity: `true` (auto-move when mouse leaves screen)
        - Show FPS: `false` (cleaner UI)
        - Round food: `true` (circular food particles)
    - **Future:** Will support user profile overrides

4. **Adding new entities:**

    - Create in: `src/server/map/`
    - Add to map manager: `src/server/map/map.js`
    - Implement rendering: `src/client/js/render.js`

5. **UI/UX changes:**
    - **Main HTML:** `src/client/index.html` (unified landing + game)
    - **Landing Page Logic:** `src/client/js/landing.js`
    - **Landing Styles:** `src/client/css/landing.css`
    - **Game Styles:** `src/client/css/main.css` (scoped to #gameView)
    - **Client Logic:** `src/client/js/app.js` (includes seamless game start)
    - **Authentication:**
        - `src/client/auth/privy-auth.jsx` - Privy React component
        - `src/client/auth/auth-modal.js` - Authentication modal wrapper
        - `webpack.react.config.js` - Webpack config for Privy bundle
        - `rebuild.sh` - Quick rebuild script with Privy app ID

---

## Architecture Summary

### Multi-Arena System

-   **Architecture:** ArenaManager orchestrates multiple isolated Arena instances
-   **Capacity:** 10 players per arena, 50 arenas max (500+ total players)
-   **Isolation:** Each arena has independent map, food, viruses, leaderboard, game loops
-   **Auto-Scaling:** Creates new arenas when existing arenas reach capacity
-   **Auto-Cleanup:** Empty arenas destroyed after 60 seconds of inactivity
-   **Room-Based:** Uses Socket.io rooms for efficient arena-scoped broadcasting

### Client-Server Communication

-   **Protocol:** WebSocket via Socket.io
-   **Update Rate:** 60Hz per arena (configurable via `networkUpdateFactor`)
-   **Events:** Minimized naming (0=move, 1=eject, 2=split) for bandwidth
-   **Arena ID:** Clients track arena membership for respawn preferences

### State Management

-   **Server-Authoritative:** All game logic computed server-side per arena
-   **Client Prediction:** Interpolation for smooth movement
-   **Visibility Culling:** Server only sends visible entities per arena
-   **Per-Arena State:** Independent game loops, leaderboards, and entity collections

### Performance Characteristics

-   **Per Arena:** 1000 food, 50 viruses, 10 players (configurable)
-   **Game Size:** 5000x5000 units per arena
-   **Target FPS:** 60 client-side, 60Hz server updates per arena
-   **Memory:** ~10-20MB per arena, ~100-150MB for 10 arenas (100 players)
-   **CPU:** 30-50% for 10 arenas on single core

---

## Common Development Tasks

### Adding a New Command

```javascript
// In src/client/js/chat-client.js
if (message.startsWith("-yourcommand")) {
    // Handle command
    window.chat.addSystemMessage("Command executed");
}
```

### Modifying Game Physics

```javascript
// In src/server/map/player.js
// Adjust speed, mass, or movement calculations
const MIN_SPEED = 6.25; // Modify base speed
const SPLIT_CELL_SPEED = 20; // Modify split velocity
```

### Adding New Socket Event

```javascript
// Server (src/server/server.js)
socket.on("newEvent", (data) => {
    // Handle event
});

// Client (src/client/js/app.js)
socket.emit("newEvent", {
    /* data */
});
```

---

## Testing Guidelines

### Running Tests

```bash
npm test  # Runs linting and Mocha tests
```

### Manual Testing Checklist

-   [ ] Multiple clients can connect simultaneously
-   [ ] Movement is smooth at 60 FPS
-   [ ] Eating mechanics work correctly
-   [ ] Split/merge timing is accurate (15 seconds)
-   [ ] Chat functions properly
-   [ ] No memory leaks over extended play
-   [ ] Mobile controls are responsive

---

## Deployment

### Google Cloud Run (Recommended)

The application is successfully deployed to Google Cloud Run with an automated deployment script.

```bash
# One-command deployment
./deploy.sh
```

**What happens during deployment:**
1. Prerequisite checks (gcloud CLI, authentication)
2. `npm run build` - Gulp build (server code + static files)
3. `node build-webpack.js` - Webpack bundles (app.js + Privy auth)
4. Local test (5 seconds)
5. Cloud Run deployment with environment variables
6. Returns live URL

**Key Configuration:**
- Port: 8080 (required by Cloud Run)
- Memory: 512Mi, CPU: 1
- Auto-scaling: 0-20 instances
- Environment: `NODE_ENV=production`, `PRIVY_APP_ID` injected at runtime

### Docker

```bash
docker build -t agarioclone .
docker run -p 8080:8080 -e PORT=8080 agarioclone
```

### Heroku

-   Use the "Deploy to Heroku" button in README
-   Or manual deployment via Heroku CLI

### Configuration for Production

```javascript
// config.js adjustments
host: "0.0.0.0",  // Bind to all interfaces
port: process.env.PORT || 8080,  // Use environment port (Cloud Run requires 8080)
```

---

## Contributing Guidelines

### Code Style

-   **Linting:** ESLint configuration in `.eslintrc`
-   **Formatting:** 4 spaces, no tabs
-   **Naming:** camelCase for variables, PascalCase for classes

### Pull Request Process

1. Fork and create feature branch
2. Run tests: `npm test`
3. Verify no linting errors
4. Test with multiple clients
5. Update documentation if needed
6. Submit PR with clear description

### Priority Areas for Contribution

1. **Performance:** WebGL rendering, better collision detection
2. **Features:** Skins, teams, power-ups
3. **Infrastructure:** Docker improvements, CI/CD
4. **Documentation:** API documentation, tutorials
5. **Testing:** Increase test coverage

---

## Debugging Tips

### Common Issues

1. **"Cannot connect to server"**

    - Check if port 8080 is available (Cloud Run default)
    - Verify firewall settings
    - Ensure `npm install --legacy-peer-deps` completed successfully

2. **Laggy gameplay**

    - Check `networkUpdateFactor` in config.js
    - Monitor server CPU/memory usage
    - Verify client FPS in browser DevTools

3. **Build failures**
    - Clear `node_modules` and reinstall with `--legacy-peer-deps`
    - Check Node.js version compatibility (18.x required)
    - Verify all dev dependencies installed
    - Run `node build-webpack.js` to rebuild webpack bundles

4. **Privy authentication not working**
    - Check `PRIVY_APP_ID` environment variable is set
    - Verify `window.ENV` is injected in HTML (view page source)
    - Ensure webpack bundle includes the app ID
    - Check browser console for Privy SDK errors

5. **Game canvas not rendering**
    - Verify `app.js` and `privy-auth-bundle.js` are loaded (check Network tab)
    - Ensure webpack bundles were built successfully
    - Check for JavaScript errors in browser console

### Useful Commands

```bash
# Monitor server logs
npm start | grep -E "(ERROR|WARNING)"

# Check for memory leaks
node --inspect bin/server/server.js

# Profile client performance
# Open Chrome DevTools > Performance tab
```

---

## Contact & Resources

-   **GitHub Issues:** Report bugs and request features
-   **Wiki:** Detailed documentation on GitHub
-   **Gitter Chat:** Community discussion
-   **Performance Doc:** See `PERFORMANCE_OPTIMIZATIONS.md`
-   **Architecture:** See `TECHNICAL_ARCHITECTURE.md`

---

## Implementation Notes

### Current State
- **Authentication:** Privy SDK fully integrated, connected to PostgreSQL ✅
- **Database:** PostgreSQL (Neon) with migration system ✅
- **User Data:** Database connected, real user profiles working ✅
- **Profile Modal:** Shows real user data from database ✅
- **User Preferences:** Fixed boolean handling, persistence working ✅
- **Virtual Wallet:** Complete PostgreSQL-based wallet system with $1 default balance ✅
- **Play Choice UX:** Smart modal for unsigned users choosing guest vs sign-up ✅
- **Leaderboard:** API endpoint ready, client integration pending
- **Session Tracking:** Temporarily disabled (causing disconnects) ⚠️
- **Stats Tracking:** Basic session tracking working, real-time stats pending

### Completed (November 2024)
- ✅ PostgreSQL migration from SQLite to Neon cloud database
- ✅ Database migration system with version tracking
- ✅ Repository layer (UserRepository, StatsRepository, SessionRepository, PreferencesRepository)
- ✅ AuthService for authentication orchestration
- ✅ REST API endpoints for auth, profiles, preferences, leaderboard
- ✅ Fixed preferences API boolean handling (was comparing to integer 1)
- ✅ Privy authentication connected to database
- ✅ User preferences UI in profile modal (replaces disabled chat commands)
- ✅ Preferences persistence working (save/load from database)
- ✅ Profile modal shows real user data from database
- ✅ Dynamic API URL detection for cross-port compatibility
- ✅ Database persistence with PostgreSQL (Neon cloud database)
- ✅ Virtual wallet system with PostgreSQL wallet_balances table
- ✅ WalletRepository with full CRUD operations and transaction support
- ✅ Wallet REST API endpoints (get, add, subtract, transfer, stats)
- ✅ Frontend wallet balance display with smart add funds button
- ✅ "Choose Your Adventure" play choice modal for unsigned users
- ✅ Mobile-responsive modal design with proper button alignment
- ✅ Auto-redirect to game after successful authentication from sign-up choice

### Known Issues
- **Session Tracking:** Game session creation/ending temporarily disabled as it causes socket disconnects for authenticated users. Needs investigation into the disconnect flow.

### Next Steps

**Fix Session Tracking (Priority 0 - Critical)**
1. Investigate why session creation causes immediate socket disconnects
2. Re-enable session tracking in server.js and arena.js
3. Ensure stats are properly tracked during gameplay

**Real-Time Stats Tracking (Priority 1)**
1. Track mass eaten during gameplay in player class
2. Track players eaten counter in game logic
3. Update session stats in real-time (not just on death)
4. Display live stats in game UI

**Leaderboard Integration (Priority 2)**
1. Connect client leaderboard to database API
2. Add daily/weekly/monthly leaderboard views
3. Show persistent global high scores
4. Display user rank in leaderboard

**Enhanced Wallet Features (Priority 3)**
1. Connect wallet earning to gameplay (mass eaten, players defeated)
2. Implement in-game purchases and spending mechanics
3. Enable Privy embedded wallets for Web3 features

**Social Features (Priority 4)**
1. Friends system
2. Private rooms
3. Enhanced profile customization

---

## Version Information

-   **Current Version:** 1.0.1
-   **Node.js Required:** 14.x or higher
-   **Last Major Update:** Database Phase A Complete - User persistence working (Nov 2024)
-   **Stable Branch:** master
-   **Development Branch:** user-data-clean
-   **Status:** Database integration complete, preferences working, real-time stats pending

---

_This document consolidates all development notes, TODOs, and roadmap items. It is specifically designed to provide context for AI assistants (especially Claude) to quickly understand the project state and contribute effectively._