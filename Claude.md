# Claude.md - LLM Context Document

## Agar.io Clone Development Status

### Project Overview

This is a functional Agar.io clone built with Node.js, Socket.io, and HTML5 Canvas. The project was originally created by @huytd and is now maintained by @owenashurst. The codebase is mature, stable, and actively maintained with recent performance optimizations.

---

## Current Development Status

### ✅ Completed Features

-   **Core Gameplay:** Fully functional multiplayer gameplay with all essential Agar.io mechanics
-   **Movement System:** Mouse-controlled cell movement with mass-based speed calculations
-   **Eating Mechanics:** Cell-to-cell consumption, food particles, mass ejection
-   **Split Mechanics:** Cell splitting with merge timer (15 seconds)
-   **Virus System:** Working virus entities that split larger cells
-   **Chat System:** In-game chat with command support (e.g., `-ping`, `-dark`)
-   **Spectator Mode:** Ability to watch games without participating
-   **Leaderboard:** Real-time top players display with "Coming Soon" badge for future enhancements
-   **Mobile Support:** Touch controls and responsive design
-   **Dark Mode:** Toggle via checkbox or chat command, changes background and grid colors
-   **Performance Optimizations:** Recent improvements including viewport culling, grid caching, socket throttling
-   **Seamless Game Experience:** Unified landing page and game in single index.html with instant play capability
-   **Auto Guest Names:** Automatically generates guest names (e.g., Guest_8209) for immediate gameplay
-   **Centralized Default Settings:** Configurable defaults in `game-config.js` (dark mode, mass display, borders, continuity enabled by default)
-   **Social Authentication:** Privy SDK integration for Google, Discord, Twitter, and Email login
-   **Guest Profile System:** Clear guest status indication with invitation to sign in for rewards

### 🚧 Next Steps & Roadmap

#### 🔐 Authentication & User System (Priority: High)

**1. Database Integration**
- [ ] Choose database system (SQLite for dev, PostgreSQL for production, or MongoDB for flexibility)
- [ ] Create user schema with Privy integration
- [ ] Create stats tracking schema (games_played, high_score, total_mass_eaten, etc.)
- [ ] Link Socket.IO sessions to authenticated users
- [ ] Implement real-time stats tracking during gameplay

**2. Leaderboard Persistence**
- [ ] Global leaderboard with all-time high scores
- [ ] Daily/Weekly/Monthly rankings
- [ ] Store match history and show recent games in profile

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
- [ ] RESTful API layer for user data
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
    -   **Authentication System:** Integrated Privy SDK for social login (Google, Discord, Twitter, Email)
    -   **Guest Profile Modal:** Improved guest experience with clear status and "Pro Tip" to encourage sign-in
    -   **Direct Auth Flow:** Removed redundant modals, clicking "Sign In" directly opens Privy authentication
    -   **Seamless Play Experience:** Merged landing page and game into unified index.html
    -   **Auto Guest Names:** Players can instantly join without entering a name
    -   **UI Improvements:** Professional landing page with animated background and modal system
    -   **Coming Soon Badge:** Added subtle indicator for future Leaderboard features
    -   **CSS Architecture:** Scoped game styles to prevent conflicts with landing page
    -   **Grid Display Fix:** Grid now fixed in world space instead of moving with player
    -   **Dark Mode:** Added functional checkbox and chat command (`-dark`) support
    -   **Documentation:** Added comprehensive technical architecture and LLM context docs
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

### Bot Limitations

-   **No explicit player limit in game code** - The server accepts connections until resources are exhausted
-   **Spawn position algorithm:** The "farthest" spawn mode may have issues with many simultaneous players
-   **Practical limits:** System resources and network bandwidth may limit concurrent players

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

### Client-Server Communication

-   **Protocol:** WebSocket via Socket.io
-   **Update Rate:** 60Hz (configurable via `networkUpdateFactor`)
-   **Events:** Minimized naming (0=move, 1=split, 2=eject) for bandwidth

### State Management

-   **Server-Authoritative:** All game logic computed server-side
-   **Client Prediction:** Interpolation for smooth movement
-   **Visibility Culling:** Server only sends visible entities

### Performance Characteristics

-   **Max Entities:** 1000 food, 50 viruses (configurable)
-   **Game Size:** 5000x5000 units
-   **Target FPS:** 60 client-side, 60Hz server updates

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

### Docker

```bash
docker build -t agarioclone .
docker run -p 3000:3000 agarioclone
```

### Heroku

-   Use the "Deploy to Heroku" button in README
-   Or manual deployment via Heroku CLI

### Configuration for Production

```javascript
// config.js adjustments
host: "0.0.0.0",  // Bind to all interfaces
port: process.env.PORT || 3000,  // Use environment port
adminPass: process.env.ADMIN_PASS || "CHANGE_THIS",  // Secure admin password
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

    - Check if port 3000 is available
    - Verify firewall settings
    - Ensure `npm install` completed successfully

2. **Laggy gameplay**

    - Check `networkUpdateFactor` in config.js
    - Monitor server CPU/memory usage
    - Verify client FPS in browser DevTools

3. **Build failures**
    - Clear `node_modules` and reinstall
    - Check Node.js version compatibility
    - Verify all dev dependencies installed

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
- **Authentication:** Privy SDK is fully integrated and working
- **User Data:** Currently using mocked data - needs database integration
- **Profile Modal:** Shows random stats - awaiting database backend
- **Leaderboard:** Only exists during active gameplay - needs persistence
- **Wallet Features:** Not yet implemented despite Privy support

### Recommended Implementation Order

**Phase 1: Basic Database (Week 1)**
1. Set up SQLite/PostgreSQL
2. Create user and stats tables
3. Link game sessions to users
4. Replace mock profile data

**Phase 2: Stats Tracking (Week 2)**
1. Implement real-time stat tracking
2. Build persistent leaderboard
3. Add match history

**Phase 3: Wallet Integration (Week 3)**
1. Enable Privy embedded wallets
2. Basic wallet display in profile
3. Plan Web3 features

**Phase 4: Social Features (Week 4+)**
1. Friends system
2. Achievement system
3. Enhanced profile customization

---

## Version Information

-   **Current Version:** 1.0.0
-   **Node.js Required:** 14.x or higher
-   **Last Major Update:** Authentication system & UI consistency (Nov 2024)
-   **Stable Branch:** master
-   **Status:** Authentication complete, awaiting database integration

---

_This document consolidates all development notes, TODOs, and roadmap items. It is specifically designed to provide context for AI assistants (especially Claude) to quickly understand the project state and contribute effectively._