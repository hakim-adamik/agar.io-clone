# Multi-Arena Architecture Design

## Executive Summary

This document outlines the complete architectural design for transforming the current single-arena Agar.io clone into a **multi-arena system** where players are automatically distributed across multiple independent game instances (arenas), with each arena supporting a maximum of 10 concurrent players.

---

## Business Requirements

### Core Scenario

1. **Players 1-10:** Join the same arena (Arena 1)
2. **Player 11:** Triggers creation of Arena 2
3. **Players 11-20:** Join Arena 2
4. **Player 21:** Triggers creation of Arena 3
5. **And so on...**

### Arena Characteristics

-   **Max Capacity:** 10 players per arena
-   **Independence:** Each arena has its own game world, entities, leaderboard
-   **Same Rules:** All arenas use identical configuration (same food, viruses, physics)
-   **Persistence:** Arenas exist as long as they have at least 1 player
-   **Cleanup:** Empty arenas are destroyed after 60 seconds

### Rejoin Logic

When a player dies or disconnects:

1. Player is removed from their current arena
2. On respawn/reconnect, player joins arena with available slots
3. Preference: Rejoin same arena if slots available
4. Otherwise: Join any arena with <10 players
5. If all arenas full: Create new arena

---

## Current Architecture Analysis

### ❌ Current Limitations (Single Arena)

**File: `src/server/server.js` (Line 18)**

```javascript
let map = new mapUtils.Map(config); // ONE global map for ALL players
```

**Key Issues:**

1. **Global State:** Single `map` instance shared by all players
2. **Global Sockets:** Single `sockets` object tracking all connections
3. **Global Leaderboard:** Single `leaderboard` array
4. **Global Game Loop:** All players processed in one tick cycle
5. **No Isolation:** Players in slot 1 can interact with players in slot 100

**Current Data Structures:**

```javascript
let map = ...;              // Single map instance
let sockets = {};           // All sockets in one object
let spectators = [];        // All spectators together
let leaderboard = [];       // One leaderboard for everyone
```

---

## Proposed Multi-Arena Architecture

### High-Level Design

```
                    ┌─────────────────────────────────┐
                    │      Server Process             │
                    │   (Node.js + Socket.io)         │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │     Arena Manager           │
                    │  (Room Assignment Logic)    │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    ┌────▼─────┐             ┌────▼─────┐             ┌────▼─────┐
    │ Arena 1  │             │ Arena 2  │             │ Arena 3  │
    │ (10/10)  │             │  (7/10)  │             │  (3/10)  │
    ├──────────┤             ├──────────┤             ├──────────┤
    │ • Map    │             │ • Map    │             │ • Map    │
    │ • Food   │             │ • Food   │             │ • Food   │
    │ • Players│             │ • Players│             │ • Players│
    │ • Viruses│             │ • Viruses│             │ • Viruses│
    │ • Loop   │             │ • Loop   │             │ • Loop   │
    └──────────┘             └──────────┘             └──────────┘
```

### Core Components

#### 1. Arena Manager

**New File:** `src/server/arena-manager.js`

**Responsibilities:**

-   Create new arenas on demand
-   Track all active arenas
-   Assign players to arenas based on availability
-   Clean up empty arenas
-   Provide arena statistics

#### 2. Arena Class

**New File:** `src/server/arena.js`

**Each Arena Contains:**

-   Unique arena ID
-   Map instance (food, viruses, mass food, players)
-   Socket collection (players in this arena)
-   Leaderboard (specific to arena)
-   Game loops (tick, update, broadcast)
-   Creation timestamp
-   Player count tracking

#### 3. Socket.io Rooms

**Integration:** Use Socket.io's built-in room functionality

**Benefits:**

-   Native support for broadcasting to specific rooms
-   Automatic room membership management
-   Easy player migration between arenas

---

## Detailed Technical Design

### Data Structures

#### Arena Manager State

```javascript
// src/server/arena-manager.js

class ArenaManager {
    constructor(config) {
        this.arenas = new Map(); // arenaId → Arena instance
        this.config = config;
        this.nextArenaId = 1;

        // Read from centralized config.js (always defined)
        this.maxPlayersPerArena = config.maxPlayersPerArena;
        this.arenaCleanupInterval = config.arenaCleanupTimeout;
        this.maxTotalArenas = config.maxTotalArenas;
        this.multiArenaEnabled = config.multiArenaEnabled;
    }

    // ... methods below
}
```

#### Arena Instance

```javascript
// src/server/arena.js

class Arena {
    constructor(arenaId, config) {
        this.id = arenaId;
        this.config = config;
        this.createdAt = Date.now();
        this.lastActivityAt = Date.now();

        // Game state (isolated per arena)
        this.map = new mapUtils.Map(config);
        this.sockets = {}; // Players in THIS arena
        this.spectators = []; // Spectators in THIS arena
        this.leaderboard = []; // Leaderboard for THIS arena
        this.leaderboardChanged = false;

        // Game loop intervals (each arena has its own)
        this.tickInterval = null;
        this.gameloopInterval = null;
        this.updateInterval = null;

        // Constants
        this.INIT_MASS_LOG = util.mathLog(
            config.defaultPlayerMass,
            config.slowBase
        );
    }

    getPlayerCount() {
        return this.map.players.data.length;
    }

    isFull() {
        // Read max from config (passed to Arena constructor)
        return this.getPlayerCount() >= this.config.maxPlayersPerArena;
    }

    isEmpty() {
        return this.getPlayerCount() === 0 && this.spectators.length === 0;
    }

    // ... game logic methods (move from server.js)
}
```

### Arena Manager Methods

```javascript
class ArenaManager {
    // ... constructor above

    /**
     * Find or create an arena with available slots
     * @param {string} preferredArenaId - Try to rejoin this arena if available
     * @returns {Arena} Arena instance with available slots
     */
    findAvailableArena(preferredArenaId = null) {
        // 1. Try preferred arena first (for respawns)
        if (preferredArenaId && this.arenas.has(preferredArenaId)) {
            const arena = this.arenas.get(preferredArenaId);
            if (!arena.isFull()) {
                return arena;
            }
        }

        // 2. Find any non-full arena
        for (const [id, arena] of this.arenas) {
            if (!arena.isFull()) {
                return arena;
            }
        }

        // 3. Create new arena if all are full
        return this.createArena();
    }

    /**
     * Create a new arena
     * @returns {Arena} New arena instance
     */
    createArena() {
        const arenaId = `arena_${this.nextArenaId++}`;
        const arena = new Arena(arenaId, this.config);

        // Start arena game loops
        arena.start();

        this.arenas.set(arenaId, arena);
        console.log(
            `[ARENA] Created ${arenaId}. Total arenas: ${this.arenas.size}`
        );

        return arena;
    }

    /**
     * Remove empty arenas to free resources
     */
    cleanupEmptyArenas() {
        const now = Date.now();
        const arenasToDelete = [];

        for (const [id, arena] of this.arenas) {
            if (
                arena.isEmpty() &&
                now - arena.lastActivityAt > this.arenaCleanupInterval
            ) {
                arenasToDelete.push(id);
            }
        }

        arenasToDelete.forEach((id) => {
            const arena = this.arenas.get(id);
            arena.stop(); // Stop game loops
            this.arenas.delete(id);
            console.log(
                `[ARENA] Cleaned up ${id}. Remaining arenas: ${this.arenas.size}`
            );
        });
    }

    /**
     * Get arena by ID
     */
    getArena(arenaId) {
        return this.arenas.get(arenaId);
    }

    /**
     * Get statistics for all arenas
     */
    getStats() {
        const stats = {
            totalArenas: this.arenas.size,
            totalPlayers: 0,
            arenas: [],
        };

        for (const [id, arena] of this.arenas) {
            const playerCount = arena.getPlayerCount();
            stats.totalPlayers += playerCount;
            stats.arenas.push({
                id,
                playerCount,
                spectatorCount: arena.spectators.length,
                createdAt: arena.createdAt,
                isFull: arena.isFull(),
            });
        }

        return stats;
    }
}

module.exports = ArenaManager;
```

### Server.js Refactoring

#### Before (Current):

```javascript
// server.js - CURRENT SINGLE ARENA
let map = new mapUtils.Map(config);
let sockets = {};
let leaderboard = [];

io.on("connection", (socket) => {
    addPlayer(socket); // All players to same map
});

const tickGame = () => {
    map.players.data.forEach(tickPlayer); // One loop for all
};

setInterval(tickGame, 1000 / 60); // Global game loop
```

#### After (Multi-Arena):

```javascript
// server.js - NEW MULTI-ARENA
const ArenaManager = require("./arena-manager");
const arenaManager = new ArenaManager(config);

// Create first arena on startup
arenaManager.createArena();

io.on("connection", (socket) => {
    let type = socket.handshake.query.type;

    switch (type) {
        case "player":
            addPlayerToArena(socket); // Smart arena assignment
            break;
        case "spectator":
            addSpectatorToArena(socket);
            break;
    }
});

const addPlayerToArena = (socket) => {
    // Store preferred arena (for respawns)
    let preferredArenaId = socket.handshake.query.arenaId || null;

    // Find or create arena
    const arena = arenaManager.findAvailableArena(preferredArenaId);

    // Join Socket.io room
    socket.join(arena.id);

    // Store arena reference on socket
    socket.arenaId = arena.id;

    // Add player to arena using existing logic
    arena.addPlayer(socket);

    console.log(
        `[ARENA] Player joined ${arena.id} (${arena.getPlayerCount()}/10)`
    );
};

// Cleanup empty arenas every 5 minutes
setInterval(() => {
    arenaManager.cleanupEmptyArenas();
}, 300000);
```

---

## Arena Class Implementation

### Arena Lifecycle

```javascript
class Arena {
    // ... constructor above

    /**
     * Start arena game loops
     */
    start() {
        // Game tick (physics, collisions) - 60 FPS
        this.tickInterval = setInterval(() => {
            this.tickGame();
        }, 1000 / 60);

        // Game loop (balance, leaderboard) - 1 FPS
        this.gameloopInterval = setInterval(() => {
            this.gameloop();
        }, 1000);

        // Send updates to clients - configurable Hz
        this.updateInterval = setInterval(() => {
            this.sendUpdates();
        }, 1000 / this.config.networkUpdateFactor);

        console.log(`[ARENA] Started game loops for ${this.id}`);
    }

    /**
     * Stop arena game loops (cleanup)
     */
    stop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        if (this.gameloopInterval) clearInterval(this.gameloopInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);

        console.log(`[ARENA] Stopped game loops for ${this.id}`);
    }

    /**
     * Add player to this arena
     */
    addPlayer(socket) {
        const currentPlayer = new mapUtils.playerUtils.Player(socket.id);

        socket.on("gotit", (clientPlayerData) => {
            console.log(
                `[ARENA ${this.id}] Player ${clientPlayerData.name} connecting!`
            );
            currentPlayer.init(
                this.generateSpawnpoint(),
                this.config.defaultPlayerMass
            );

            if (this.map.players.findIndexByID(socket.id) > -1) {
                console.log(
                    `[ARENA ${this.id}] Player ID already connected, kicking.`
                );
                socket.disconnect();
                return;
            }

            if (!util.validNick(clientPlayerData.name)) {
                socket.emit("kick", "Invalid username.");
                socket.disconnect();
                return;
            }

            this.sockets[socket.id] = socket;
            const sanitizedName = clientPlayerData.name.replace(
                /(<([^>]+)>)/gi,
                ""
            );
            clientPlayerData.name = sanitizedName;

            currentPlayer.clientProvidedData(clientPlayerData);
            this.map.players.pushNew(currentPlayer);

            // Broadcast only to THIS arena
            this.broadcastToArena("playerJoin", { name: currentPlayer.name });

            console.log(
                `[ARENA ${this.id}] Total players: ${this.map.players.data.length}`
            );
            this.lastActivityAt = Date.now();
        });

        this.setupPlayerEvents(socket, currentPlayer);
    }

    /**
     * Setup socket event handlers for a player
     */
    setupPlayerEvents(socket, currentPlayer) {
        // Respawn handler
        socket.on("respawn", () => {
            this.map.players.removePlayerByID(currentPlayer.id);
            socket.emit("welcome", currentPlayer, {
                width: this.config.gameWidth,
                height: this.config.gameHeight,
                arenaId: this.id, // Tell client which arena they're in
            });
            console.log(
                `[ARENA ${this.id}] User ${currentPlayer.name} respawned`
            );
            this.lastActivityAt = Date.now();
        });

        // Disconnect handler
        socket.on("disconnect", () => {
            this.map.players.removePlayerByID(currentPlayer.id);
            delete this.sockets[socket.id];
            console.log(
                `[ARENA ${this.id}] User ${currentPlayer.name} disconnected`
            );
            this.broadcastToArena("playerDisconnect", {
                name: currentPlayer.name,
            });
            this.lastActivityAt = Date.now();
        });

        // Movement handler
        socket.on("0", (target) => {
            currentPlayer.lastHeartbeat = new Date().getTime();
            if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
                currentPlayer.target = target;
            }
            this.lastActivityAt = Date.now();
        });

        // Split handler
        socket.on("2", () => {
            currentPlayer.userSplit(
                this.config.limitSplit,
                this.config.defaultPlayerMass
            );
            this.lastActivityAt = Date.now();
        });

        // Eject mass handler
        socket.on("1", () => {
            const minCellMass =
                this.config.defaultPlayerMass + this.config.fireFood;
            for (let i = 0; i < currentPlayer.cells.length; i++) {
                if (currentPlayer.cells[i].mass >= minCellMass) {
                    currentPlayer.changeCellMass(i, -this.config.fireFood);
                    this.map.massFood.addNew(
                        currentPlayer,
                        i,
                        this.config.fireFood
                    );
                }
            }
            this.lastActivityAt = Date.now();
        });

        // Chat, admin commands, etc. (similar pattern)
        this.setupChatEvents(socket, currentPlayer);
        this.setupAdminEvents(socket, currentPlayer);
    }

    /**
     * Generate spawn point for this arena
     */
    generateSpawnpoint() {
        const radius = util.massToRadius(this.config.defaultPlayerMass);
        return getPosition(
            this.config.newPlayerInitialPosition === "farthest",
            radius,
            this.map.players.data
        );
    }

    /**
     * Broadcast event to all players in THIS arena only
     */
    broadcastToArena(event, data) {
        for (const socketId in this.sockets) {
            this.sockets[socketId].emit(event, data);
        }
    }

    /**
     * Game tick - physics and collisions for THIS arena
     */
    tickGame() {
        this.map.players.data.forEach((player) => this.tickPlayer(player));
        this.map.massFood.move(this.config.gameWidth, this.config.gameHeight);

        this.map.players.handleCollisions((gotEaten, eater) => {
            const cellGotEaten = this.map.players.getCell(
                gotEaten.playerIndex,
                gotEaten.cellIndex
            );
            this.map.players.data[eater.playerIndex].changeCellMass(
                eater.cellIndex,
                cellGotEaten.mass
            );

            const playerDied = this.map.players.removeCell(
                gotEaten.playerIndex,
                gotEaten.cellIndex
            );
            if (playerDied) {
                let playerGotEaten =
                    this.map.players.data[gotEaten.playerIndex];
                this.broadcastToArena("playerDied", {
                    name: playerGotEaten.name,
                });
                this.sockets[playerGotEaten.id].emit("RIP");
                this.map.players.removePlayerByIndex(gotEaten.playerIndex);
            }
        });
    }

    /**
     * Game loop - balancing and leaderboard for THIS arena
     */
    gameloop() {
        if (this.map.players.data.length > 0) {
            this.calculateLeaderboard();
            this.map.players.shrinkCells(
                this.config.massLossRate,
                this.config.defaultPlayerMass,
                this.config.minMassLoss
            );
        }

        this.map.balanceMass(
            this.config.foodMass,
            this.config.gameMass,
            this.config.maxFood,
            this.config.maxVirus
        );
    }

    /**
     * Send updates to players in THIS arena
     */
    sendUpdates() {
        // Update spectators
        this.spectators.forEach((socketId) => this.updateSpectator(socketId));

        // Update players
        this.map.enumerateWhatPlayersSee(
            (
                playerData,
                visiblePlayers,
                visibleFood,
                visibleMass,
                visibleViruses
            ) => {
                this.sockets[playerData.id].emit(
                    "serverTellPlayerMove",
                    playerData,
                    visiblePlayers,
                    visibleFood,
                    visibleMass,
                    visibleViruses
                );

                if (this.leaderboardChanged) {
                    this.sendLeaderboard(this.sockets[playerData.id]);
                }
            }
        );

        this.leaderboardChanged = false;
    }

    // ... other methods (tickPlayer, calculateLeaderboard, etc.)
}
```

---

## Modified server.js Structure

### New Server Flow

```javascript
/*jslint bitwise: true, node: true */
"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const SAT = require("sat");

const ArenaManager = require("./arena-manager");
const config = require("../../config");

// Initialize arena manager (replaces single map)
const arenaManager = new ArenaManager(config);

// Create initial arena
arenaManager.createArena();

// Serve static files and environment injection (unchanged)
app.get("/", (req, res) => {
    // ... existing HTML injection code
});
app.use(express.static(__dirname + "/../client"));

// Socket connection handler
io.on("connection", function (socket) {
    let type = socket.handshake.query.type;
    console.log("[SERVER] User connected: " + type);

    switch (type) {
        case "player":
            addPlayerToArena(socket);
            break;
        case "spectator":
            addSpectatorToArena(socket);
            break;
        default:
            console.log("[SERVER] Unknown user type");
    }
});

/**
 * Add player to an available arena
 */
const addPlayerToArena = (socket) => {
    // Check if player is respawning (has preferred arena)
    const preferredArenaId = socket.handshake.query.arenaId || null;

    // Find or create arena
    const arena = arenaManager.findAvailableArena(preferredArenaId);

    // Join Socket.io room
    socket.join(arena.id);

    // Store arena ID on socket for reference
    socket.arenaId = arena.id;

    // Delegate to arena
    arena.addPlayer(socket);

    // Log global stats
    const stats = arenaManager.getStats();
    console.log(
        `[SERVER] Total players across all arenas: ${stats.totalPlayers}`
    );
};

/**
 * Add spectator to an arena
 */
const addSpectatorToArena = (socket) => {
    // Spectators join any active arena (prefer first one)
    const arena =
        arenaManager.arenas.values().next().value || arenaManager.createArena();

    socket.join(arena.id);
    socket.arenaId = arena.id;

    arena.addSpectator(socket);
};

// Cleanup empty arenas every 5 minutes
setInterval(() => {
    arenaManager.cleanupEmptyArenas();
}, 300000);

// Server stats logging every 30 seconds
setInterval(() => {
    const stats = arenaManager.getStats();
    console.log(
        `[STATS] Arenas: ${stats.totalArenas}, Players: ${stats.totalPlayers}`
    );
}, 30000);

// Start server
const ipaddress =
    process.env.OPENSHIFT_NODEJS_IP || process.env.IP || config.host;
const serverport =
    process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || config.port;
http.listen(serverport, ipaddress, () => {
    console.log("[SERVER] Listening on " + ipaddress + ":" + serverport);
});
```

---

## Client-Side Changes

### Minimal Client Impact

**What Needs to Change:**

1. **Arena ID Tracking:** Store `arenaId` from `'welcome'` event
2. **Respawn with Arena:** Include `arenaId` in reconnection query

**File: `src/client/js/app.js`**

```javascript
// Store arena ID globally
global.arenaId = null;

// On welcome event, store arena ID
socket.on("welcome", function (playerSettings, gameSizes) {
    // ... existing code

    // NEW: Store arena ID if provided
    if (gameSizes.arenaId) {
        global.arenaId = gameSizes.arenaId;
        console.log(`[CLIENT] Joined arena: ${gameSizes.arenaId}`);
    }

    // ... rest of welcome handler
});

// When reconnecting/respawning
function startGame(type) {
    // ... existing code

    if (!socket) {
        // NEW: Include arena ID in connection query
        const query = `type=${type}${
            global.arenaId ? "&arenaId=" + global.arenaId : ""
        }`;
        socket = io({ query });
        setupSocket(socket);
    }

    // ... rest of startGame
}
```

---

## Database Schema Changes

### Arena Tracking in Database

When implementing user data persistence (Phase A+), add arena context:

```sql
-- Add to game_sessions table
ALTER TABLE game_sessions ADD COLUMN arena_id TEXT;

-- Add to leaderboard table (for per-arena leaderboards)
ALTER TABLE leaderboard ADD COLUMN arena_id TEXT;
ALTER TABLE leaderboard ADD COLUMN scope TEXT DEFAULT 'global';  -- 'arena' or 'global'

-- Index for arena-specific queries
CREATE INDEX idx_sessions_arena ON game_sessions(arena_id, started_at DESC);
CREATE INDEX idx_leaderboard_arena ON leaderboard(arena_id, score DESC);
```

**Future Features:**

-   Per-arena leaderboards
-   Arena-specific stats
-   Arena performance metrics
-   Popular arenas tracking

---

## Migration Strategy

### Phase 1: Core Multi-Arena (Week 1)

**Priority: CRITICAL**

1. Create `ArenaManager` class
2. Create `Arena` class with isolated game loops
3. Refactor `server.js` to use ArenaManager
4. Move player event handlers into Arena class
5. Test with 50+ bots

**Deliverables:**

-   Multiple arenas working
-   10-player limit per arena
-   Auto-arena creation
-   Player assignment logic

### Phase 2: Arena Cleanup & Optimization (Week 1)

**Priority: HIGH**

1. Implement empty arena cleanup
2. Add arena statistics tracking
3. Test arena destruction/creation under load
4. Memory leak testing

### Phase 3: Client Updates (Week 2)

**Priority: MEDIUM**

1. Add arena ID to client state
2. Update reconnection logic to prefer same arena
3. Add arena indicator to UI (optional)
4. Test arena switching on respawn

### Phase 4: Database Integration (Week 2)

**Priority: MEDIUM**

1. Add `arena_id` column to relevant tables
2. Update repositories to track arena context
3. Support per-arena and global leaderboards
4. Arena performance analytics

---

## Testing Strategy

### Unit Tests

1. **ArenaManager Tests:**

    - Creating arenas
    - Finding available arenas
    - Cleanup logic
    - Max capacity enforcement

2. **Arena Tests:**
    - Isolated game loops
    - Player addition/removal
    - Leaderboard calculation
    - Event broadcasting scope

### Integration Tests

1. **Multi-Player Flow:**

    - 10 players join → same arena
    - 11th player → new arena
    - Player death → rejoins same arena
    - Arena full → joins different arena

2. **Load Testing:**
    - 100 bots across 10 arenas
    - Concurrent arena creation/destruction
    - Memory usage monitoring
    - CPU usage per arena

### Performance Benchmarks

**Targets:**

-   **10 arenas (100 players):** <50% CPU usage
-   **Arena creation:** <100ms
-   **Arena destruction:** <50ms
-   **Memory per arena:** ~10-20MB
-   **No memory leaks** after 1000 arena cycles

---

## Performance Considerations

### Resource Usage

**Per Arena:**

-   Map instance: ~5-10MB
-   1000 food particles: ~0.5MB
-   50 viruses: ~0.1MB
-   10 players: ~0.5MB
-   3 setInterval loops: Minimal CPU

**10 Arenas (100 players):**

-   Memory: ~100-150MB
-   CPU: 30-50% on single core

### Optimization Strategies

1. **Lazy Arena Creation:**

    - Don't pre-create arenas
    - Create on-demand only

2. **Aggressive Cleanup:**

    - 60-second empty arena timeout
    - Stop game loops immediately on empty

3. **Shared Resources:**

    - Config object shared (read-only)
    - Utility functions shared
    - Static assets shared

4. **Future: Arena Pooling:**
    - Reuse arena instances instead of creating new
    - Reset state instead of destroying

---

## Backward Compatibility

### Maintaining Current Behavior

For clients that don't provide `arenaId`:

-   Automatically assigned to available arena
-   No breaking changes to socket protocol
-   Existing bots work without modification

### Centralized Configuration

**All multi-arena settings in `config.js`** (alongside existing game settings):

```javascript
module.exports = {
    // Existing game configuration
    host: "0.0.0.0",
    port: process.env.PORT || 8080,
    gameWidth: 5000,
    gameHeight: 5000,
    defaultPlayerMass: 10,
    foodMass: 1,
    maxFood: 1000,
    maxVirus: 50,
    slowBase: 4.5,
    massLossRate: 1,
    minMassLoss: 50,
    // ... other existing settings

    // NEW: Multi-arena configuration
    multiArenaEnabled: true, // Enable/disable multi-arena system
    maxPlayersPerArena: 10, // Player capacity per arena
    arenaCleanupTimeout: 60000, // 60 seconds before empty arena cleanup
    maxTotalArenas: 50, // Maximum concurrent arenas (resource limit)

    // ... rest of config
};
```

**Benefits of Centralization:**

-   ✅ Single source of truth for ALL game settings
-   ✅ Easy to adjust arena size (change 10 → 20 in one place)
-   ✅ Feature flag for multi-arena (enable/disable)
-   ✅ Resource limits configurable
-   ✅ Consistent with existing architecture
-   ✅ Easy maintenance and tuning

---

## Security Considerations

### Arena Isolation

1. **No Cross-Arena Interaction:**

    - Players in Arena 1 cannot see/affect Arena 2
    - Socket events scoped to arena rooms
    - Leaderboards isolated (optional global aggregate)

2. **Arena Hopping Prevention:**

    - Players assigned to arena on connection
    - Cannot switch arenas mid-game
    - Must die/disconnect to change arenas

3. **Resource Limits:**
    - Max arenas cap (e.g., 50 arenas = 500 players max)
    - Prevent arena creation DoS attacks
    - Monitor memory usage

### Anti-Cheat

1. **Validate Arena ID:**

    - Server assigns arena, not client
    - Reject manual arena selection attempts
    - Log suspicious arena switching

2. **Rate Limiting:**
    - Limit respawn frequency
    - Prevent rapid arena cycling
    - Monitor spawn abuse

---

## Error Handling

### Arena Creation Failures

```javascript
try {
    const arena = arenaManager.createArena();
} catch (err) {
    console.error("[ARENA] Failed to create arena:", err);
    // Fall back to existing arena
    return arenaManager.arenas.values().next().value;
}
```

### Arena Crash Recovery

```javascript
// Graceful arena failure
Arena.prototype.handleError = function (err) {
    console.error(`[ARENA ${this.id}] Error:`, err);

    // Notify all players
    this.broadcastToArena("serverMSG", "Arena error - you will be moved");

    // Migrate players to different arena
    for (const socketId in this.sockets) {
        const newArena = arenaManager.findAvailableArena();
        this.sockets[socketId].leave(this.id);
        this.sockets[socketId].join(newArena.id);
        newArena.addPlayer(this.sockets[socketId]);
    }

    // Self-destruct
    this.stop();
    arenaManager.arenas.delete(this.id);
};
```

---

## Monitoring & Metrics

### Arena Statistics

```javascript
// GET /api/arenas
app.get('/api/arenas', (req, res) => {
    res.json(arenaManager.getStats());
});

// Example response:
{
    "totalArenas": 7,
    "totalPlayers": 63,
    "arenas": [
        {
            "id": "arena_1",
            "playerCount": 10,
            "spectatorCount": 2,
            "createdAt": 1699284000000,
            "isFull": true
        },
        {
            "id": "arena_2",
            "playerCount": 8,
            "spectatorCount": 0,
            "createdAt": 1699284120000,
            "isFull": false
        }
        // ...
    ]
}
```

### Logging

```javascript
// Arena lifecycle events
console.log(`[ARENA ${id}] Created`);
console.log(`[ARENA ${id}] Player joined (${count}/10)`);
console.log(`[ARENA ${id}] Player left (${count}/10)`);
console.log(`[ARENA ${id}] Cleaned up (empty for 60s)`);

// Server-level stats
console.log(`[SERVER] Arenas: ${n}, Total Players: ${m}`);
```

---

## Future Enhancements

### Arena Variants (Future)

Different arena types with different rules:

-   **FFA Arena:** Current free-for-all mode (10 players)
-   **Team Arena:** 2 teams of 5 players
-   **Tournament Arena:** Ranked competitive play
-   **Practice Arena:** Solo with bots only
-   **High Stakes Arena:** Money-based gameplay (Phase C)

### Smart Matchmaking (Future)

-   Skill-based arena assignment
-   Region-based routing
-   Friend/party system
-   Private arenas

### Cross-Arena Features (Future)

-   Global leaderboard (aggregated)
-   Cross-arena chat channels
-   Arena migration requests
-   Spectator arena hopping

---

## Implementation Checklist

### Before Starting

-   [x] Document current single-arena architecture
-   [x] Design multi-arena system
-   [x] Review all related code files
-   [x] Plan database schema changes
-   [ ] Get user approval for approach

### Implementation Tasks

-   [ ] Create `ArenaManager` class
-   [ ] Create `Arena` class
-   [ ] Refactor `server.js` to use ArenaManager
-   [ ] Move game loops into Arena class
-   [ ] Add Socket.io room management
-   [ ] Implement arena assignment logic
-   [ ] Add arena cleanup mechanism
-   [ ] Update client to track arena ID
-   [ ] Add respawn-to-same-arena logic
-   [ ] Test with 50-100 bots
-   [ ] Update config.js with multi-arena settings
-   [ ] Add /api/arenas endpoint for monitoring
-   [ ] Write unit tests for ArenaManager
-   [ ] Write integration tests for multi-arena flow
-   [ ] Update documentation

### Database Updates (After Multi-Arena Works)

-   [ ] Add `arena_id` to game_sessions
-   [ ] Add `arena_id` to leaderboard
-   [ ] Support per-arena and global leaderboards
-   [ ] Update all repositories for arena context

---

## Estimated Timeline

**Week 1:**

-   Days 1-2: ArenaManager + Arena class implementation
-   Days 3-4: Server.js refactoring and testing
-   Day 5: Client updates and integration testing

**Week 2:**

-   Days 1-2: Bug fixes and edge cases
-   Days 3-4: Performance testing and optimization
-   Day 5: Documentation and deployment

**Total:** ~2 weeks for stable multi-arena system

---

## Risk Assessment

### High Risk Areas

1. **Game Loop Timing:**

    - Multiple setInterval per arena
    - Potential CPU bottleneck with 10+ arenas
    - **Mitigation:** Performance testing, lazy cleanup

2. **Memory Leaks:**

    - Arena instances not properly destroyed
    - References to deleted arenas
    - **Mitigation:** Careful cleanup, memory profiling

3. **Socket.io Room Bugs:**
    - Players stuck in wrong rooms
    - Event broadcasting to wrong arenas
    - **Mitigation:** Thorough testing, logging

### Medium Risk Areas

1. **Player Migration:**

    - Complex rejoin logic
    - Edge cases (arena full on rejoin)
    - **Mitigation:** Fallback to any available arena

2. **Race Conditions:**
    - Concurrent arena creation
    - Player count synchronization
    - **Mitigation:** Use locks/semaphores if needed

---

## Success Criteria

✅ **Multi-arena system is successful if:**

1. 100 players can play simultaneously across 10 arenas
2. Each arena has 10 players max
3. Players automatically assigned to arenas
4. Dead players can rejoin same arena (if space)
5. Empty arenas are cleaned up within 60 seconds
6. No performance degradation vs single arena
7. No memory leaks after 1000 games
8. All existing features work (chat, admin, spectator)

---

_Document Status: Draft for Review_  
_Next Step: Get user approval before implementation_  
_Estimated Implementation: 2 weeks_
