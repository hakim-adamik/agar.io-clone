# Technical Architecture Document
## Agar.io Clone

### Executive Summary

This document provides a comprehensive technical overview of the Agar.io clone implementation. The application is built using a client-server architecture with real-time WebSocket communication, featuring a Node.js/Express backend and an HTML5 Canvas frontend. The game implements the core mechanics of Agar.io including cell movement, mass accumulation, splitting mechanics, and multiplayer interaction.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐                    ┌──────────────────────────┐
│                 │   WebSocket (io)    │     Server (Node.js)     │
│  Client (HTML5) │◄──────────────────►│    + Express + Socket.io │
│   Canvas + JS   │                    │                          │
│  + Privy Auth   │                    │    ┌────────────────┐    │
│                 │                    │    │ ArenaManager   │    │
└─────────────────┘                    │    └───────┬────────┘    │
         │                             │            │             │
         │                             │    ┌───────▼────────┐    │
    ┌────▼────┐                       │    │  Arena 1..N    │    │
    │ Webpack │                       │    │ (10 players)   │    │
    │  Build  │                       │    └────────────────┘    │
    └─────────┘                       └──────────────────────────┘
                                                   │
                                              ┌────▼────┐
                                              │ SQLite3 │
                                              │   DB    │
                                              └─────────┘
```

### 1.2 Technology Stack

- **Frontend:** HTML5 Canvas, JavaScript (ES6+), Socket.io-client, Privy SDK
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** SQLite3 (for chat and logging)
- **Build Tools:** Webpack, Gulp, Babel
- **Testing:** Mocha, Chai
- **Utilities:** SAT.js (collision detection), UUID
- **Authentication:** Privy SDK (Google, Discord, Twitter, Email)
- **Multi-Arena:** ArenaManager for scalable game instances

---

## 2. Project Structure

```
agar.io-clone/
├── src/                     # Source code
│   ├── client/             # Client-side code
│   │   ├── js/            # JavaScript modules
│   │   ├── css/           # Stylesheets
│   │   ├── img/           # Images
│   │   └── audio/         # Sound effects
│   └── server/            # Server-side code
│       ├── map/           # Game entities
│       ├── lib/           # Utilities
│       └── repositories/  # Data access layer
├── bin/                    # Compiled/built code
│   ├── client/            # Built client assets
│   └── server/            # Transpiled server code
├── test/                   # Test suite
├── config.js              # Game configuration
├── gulpfile.js            # Build automation
├── webpack.config.js      # Webpack bundling
└── package.json           # Dependencies
```

---

## 3. Server Architecture

### 3.1 Core Server Components

#### 3.1.1 Main Server (`src/server/server.js`)
- **Purpose:** Entry point for the server application
- **Responsibilities:**
  - Express server initialization
  - Socket.io connection management
  - Player lifecycle management (join, disconnect, respawn)
  - Game loop coordination (60Hz update cycle)
  - Leaderboard management
  - Client state broadcasting

#### 3.1.2 Game Logic (`src/server/game-logic.js`)
- **Purpose:** Core game mechanics implementation
- **Key Functions:**
  - `adjustForBoundaries()`: Keeps entities within game boundaries
  - Collision detection coordination
  - Physics calculations

### 3.2 Map System (`src/server/map/`)

#### 3.2.1 Map Manager (`map.js`)
- **Purpose:** Central game state management
- **Components:**
  - Player collection management
  - Food generation and distribution
  - Virus spawning logic
  - Mass food (fire food) management
  - Entity visibility calculations

#### 3.2.2 Player System (`player.js`)
- **Classes:**
  - `Player`: Player entity management
    - Cell collection
    - Mass tracking
    - Heartbeat monitoring
    - Split/merge mechanics
  - `Cell`: Individual cell physics
    - Movement calculation
    - Mass management
    - Collision detection (using SAT.js)
    - Speed decay mechanics

#### 3.2.3 Food Entities
- **Food (`food.js`):** Basic consumable entities
  - Random color generation
  - Uniform/random distribution
- **Mass Food (`massFood.js`):** Ejected mass from players
  - Player-colored appearance
  - Directional movement
- **Virus (`virus.js`):** Splitting mechanism
  - Fixed mass range (100-150)
  - Player splitting on collision

### 3.3 Data Persistence (`src/server/repositories/`)

- **Chat Repository (`chat-repository.js`):**
  - Message persistence
  - Chat history management
  - SQLite3 integration

- **Logging Repository (`logging-repository.js`):**
  - Game event logging
  - Performance metrics
  - Error tracking

### 3.4 Multi-Arena System

#### 3.4.1 ArenaManager (`src/server/arena-manager.js`)
- **Purpose:** Orchestrates multiple game instances
- **Responsibilities:**
  - Dynamic arena creation/destruction
  - Player distribution across arenas
  - Arena lifecycle management
  - Resource optimization
- **Key Features:**
  - Auto-creates arenas when capacity reached (10 players/arena)
  - Cleans up empty arenas after 60 seconds
  - Smart player assignment with rejoin preferences
  - Supports 500+ concurrent players

#### 3.4.2 Arena (`src/server/arena.js`)
- **Purpose:** Isolated game instance
- **Components:**
  - Independent map with own food, viruses, mass food
  - Separate player collection (max 10)
  - Isolated leaderboard
  - Independent game loop (60Hz)
- **Isolation:**
  - Socket.io room-based broadcasting
  - No cross-arena communication
  - Independent entity IDs

### 3.5 Utilities (`src/server/lib/`)

- **Entity Utils (`entityUtils.js`):**
  - Position calculation
  - Spawn point generation
  - Distance calculations

- **General Utils (`util.js`):**
  - Mass-to-radius conversion
  - Nickname validation
  - Mathematical utilities
  - Random number generation

---

## 4. Client Architecture

### 4.1 Core Client Components

#### 4.1.1 Application Entry (`src/client/js/app.js`)
- **Purpose:** Client initialization and game loop
- **Responsibilities:**
  - WebSocket connection establishment
  - User input handling (mouse, keyboard)
  - Game state interpolation
  - Render loop management (requestAnimationFrame)
  - Performance optimizations (viewport culling, socket throttling)

#### 4.1.2 Rendering Engine (`src/client/js/render.js`)
- **Purpose:** Visual representation of game state
- **Features:**
  - Grid rendering with caching optimization (fixed in world space)
  - Entity drawing (cells, food, viruses)
  - Text rendering (names, mass)
  - Border correction for cells at boundaries
  - Performance-optimized drawing routines
  - Dark mode support (background and grid color switching)

#### 4.1.3 Canvas Management (`src/client/js/canvas.js`)
- **Purpose:** Canvas setup and coordinate transformation
- **Functions:**
  - Viewport management
  - Screen-to-world coordinate conversion
  - Zoom level calculation based on player mass
  - Camera following

#### 4.1.4 Chat System (`src/client/js/chat-client.js`)
- **Purpose:** In-game communication
- **Features:**
  - Message sending/receiving
  - Command processing (e.g., -ping)
  - UI overlay management
  - Chat history

#### 4.1.5 Global State (`src/client/js/global.js`)
- **Purpose:** Shared client state
- **Contains:**
  - Player configuration
  - Screen dimensions
  - Input state
  - Game settings

#### 4.1.6 Authentication System
- **Privy Auth Component (`src/client/auth/privy-auth.jsx`):**
  - React-based authentication component
  - Social login providers (Google, Discord, Twitter)
  - Email authentication fallback
  - Session management
- **Auth Modal (`src/client/auth/auth-modal.js`):**
  - Modal wrapper for authentication UI
  - Integration with landing page
  - State synchronization with game
- **Guest System:**
  - Auto-generated guest names (Guest_XXXX)
  - Instant play without registration
  - Profile modal with sign-in prompts

### 4.2 Client-Server Communication Protocol

#### 4.2.1 Socket Events (Client → Server)
- `gotit`: Initial connection with player data
- `windowResized`: Viewport dimension updates
- `respawn`: Player respawn request
- `0`: Mouse position updates (optimized naming)
- `1`: Split command
- `2`: Eject mass command
- `chat`: Chat messages
- `pingcheck`: Latency measurement

#### 4.2.2 Socket Events (Server → Client)
- `welcome`: Initial game state
- `serverTellPlayerMove`: Position updates
- `serverSendPlayerChat`: Chat messages
- `RIP`: Player death notification
- `kick`: Disconnection reason
- `pongcheck`: Latency response

---

## 5. Game Mechanics Implementation

### 5.1 Movement System
- **Speed Formula:** Base speed decreases with mass (logarithmic)
- **Minimum Speed:** 6.25 units
- **Split Speed:** 20 units initial velocity
- **Decay:** 0.5 units per tick until minimum

### 5.2 Mass System
- **Default Mass:** 10 units
- **Food Mass:** 1 unit
- **Mass Loss:** Configurable rate (1% default)
- **Minimum Loss Threshold:** 50 units total mass

### 5.3 Collision Detection
- **Library:** SAT.js (Separating Axis Theorem)
- **Types:**
  - Cell-to-cell (eating mechanics)
  - Cell-to-food (growth)
  - Cell-to-virus (splitting)
  - Cell-to-mass (growth)

### 5.4 Visibility System
- **Server-side culling:** Only sends visible entities
- **Client-side culling:** Only renders viewport entities
- **Update Rate:** 60Hz configurable

---

## 6. Build and Deployment

### 6.1 Build Pipeline (Gulp)

1. **Linting:** ESLint validation
2. **Transpilation:** Babel for ES6+ compatibility
3. **Bundling:** Webpack for client assets
4. **Testing:** Mocha test execution
5. **Output:** `bin/` directory structure

### 6.2 Development Workflow

- `npm start`: Production build and run
- `npm run watch`: Development mode with hot reload
- `npm test`: Run test suite
- `npm run build`: Build without starting

### 6.3 Configuration (`config.js`)

Key parameters:
- **Game dimensions:** 5000x5000 units
- **Entity limits:** 1000 food, 50 viruses
- **Network update:** 60Hz
- **Performance tuning:** Mass loss, speed calculations

---

## 7. Performance Optimizations

### 7.1 Client Optimizations
- **Viewport Culling:** Only render visible entities
- **Grid Caching:** Reuse grid drawing between frames (with world-space fixed positioning)
- **Socket Throttling:** Limit update frequency
- **Dynamic LOD:** Reduce polygon complexity for borders
- **Dark Mode:** Optimized color switching without performance impact

### 7.2 Server Optimizations
- **Spatial Indexing:** Efficient collision detection
- **Update Batching:** Combine multiple updates
- **Heartbeat Monitoring:** Remove inactive players
- **Visibility Culling:** Send only relevant entities

---

## 8. Security Considerations

### 8.1 Input Validation
- Nickname sanitization (XSS prevention)
- Position validation (anti-cheat)
- Command injection prevention

### 8.2 Rate Limiting
- Connection throttling
- Message rate limits
- Movement validation

### 8.3 State Authority
- Server-authoritative architecture
- Client prediction with reconciliation
- Anti-cheat measures

---

## 9. Database Schema

### 9.1 Chat Messages
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    player_name TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Game Logs
```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY,
    event_type TEXT,
    data JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. Future Architecture Considerations

### 10.1 Scalability
- **Horizontal Scaling:** Multiple game rooms
- **Load Balancing:** Distribute players across servers
- **Redis Integration:** Shared state management

### 10.2 Performance
- **WebGL Rendering:** GPU acceleration
- **WebAssembly:** Critical path optimization
- **Worker Threads:** Offload calculations

### 10.3 Features
- **Replay System:** Record and playback
- **Tournament Mode:** Competitive features
- **Mobile Optimization:** Touch controls

---

## Appendix A: Key Algorithms

### Mass to Radius Conversion
```javascript
radius = 4 + sqrt(mass) * 6
```

### Speed Calculation
```javascript
speed = baseSpeed / log(mass, slowBase)
```

### Visibility Range
```javascript
range = sqrt(mass) * k + baseRange
```

---

## Appendix B: Network Protocol

Binary optimization for high-frequency updates:
- Position updates: 12 bytes (ID + X + Y)
- Mass updates: 8 bytes (ID + mass)
- Minimal JSON for low-frequency events

---

*Document Version: 1.0*
*Last Updated: November 2024*
*Architecture Review Status: Current*