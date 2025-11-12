/*jslint bitwise: true, node: true */
'use strict';

const uWS = require('uwebsockets.js');
const config = require('../../config');

// Create the app
const app = uWS.App();

// Store WebSocket connections by arena
const arenas = new Map();
const connections = new Map(); // ws -> {arenaId, playerId, playerName}

// Simple arena management
class SimpleArena {
    constructor(id) {
        this.id = id;
        this.players = new Set();
        this.gameState = {
            players: {},
            foods: [],
            viruses: []
        };
    }

    addPlayer(ws, playerId) {
        this.players.add(ws);
        this.gameState.players[playerId] = {
            x: Math.random() * 5000,
            y: Math.random() * 5000,
            cells: [],
            hue: Math.random() * 360
        };
    }

    removePlayer(ws, playerId) {
        this.players.delete(ws);
        delete this.gameState.players[playerId];
    }

    broadcast(message, exclude) {
        const data = JSON.stringify(message);
        for (const ws of this.players) {
            if (ws !== exclude && ws.readyState === 1) {
                ws.send(data);
            }
        }
    }

    broadcastBinary(buffer, exclude) {
        for (const ws of this.players) {
            if (ws !== exclude && ws.readyState === 1) {
                ws.send(buffer, true); // true for binary
            }
        }
    }
}

// HTTP routes for serving the client
app.get('/*', (res, req) => {
    // For now, just return a simple message
    res.end('uWebSockets server running. Connect via WebSocket.');
});

// WebSocket route
app.ws('/*', {
    // Configuration
    idleTimeout: 120,
    maxBackpressure: 1024 * 1024, // 1MB
    maxPayloadLength: 16 * 1024 * 1024, // 16MB
    compression: uWS.DISABLED, // IMPORTANT: Disable compression for lowest latency

    // Handle new connection
    open: (ws, req) => {
        console.log('[uWS] New connection');

        // Parse query parameters from the URL
        const url = req.getUrl();
        const query = req.getQuery();

        // Simple query parsing (you might want to use a proper parser)
        const params = {};
        if (query) {
            query.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[key] = decodeURIComponent(value || '');
            });
        }

        const playerId = Math.random().toString(36).substr(2, 9);
        const playerName = params.playerName || `Guest_${Math.floor(Math.random() * 10000)}`;
        const arenaId = params.arenaId || 'arena_1';

        // Create or get arena
        if (!arenas.has(arenaId)) {
            arenas.set(arenaId, new SimpleArena(arenaId));
            console.log(`[uWS] Created arena: ${arenaId}`);
        }

        const arena = arenas.get(arenaId);

        // Store connection info
        connections.set(ws, {
            arenaId,
            playerId,
            playerName,
            lastUpdate: Date.now()
        });

        // Add player to arena
        arena.addPlayer(ws, playerId);

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'welcome',
            playerId,
            arenaId
        }));

        console.log(`[uWS] Player ${playerName} (${playerId}) joined ${arenaId}`);
    },

    // Handle incoming messages
    message: (ws, message, isBinary) => {
        const conn = connections.get(ws);
        if (!conn) return;

        const arena = arenas.get(conn.arenaId);
        if (!arena) return;

        // Update timestamp
        conn.lastUpdate = Date.now();

        if (isBinary) {
            // Handle binary messages (e.g., movement data)
            // For now, just broadcast to others in the arena
            arena.broadcastBinary(message, ws);
        } else {
            // Handle JSON messages
            try {
                const data = JSON.parse(Buffer.from(message).toString());

                switch (data.type) {
                    case 'move':
                        // Update player position
                        if (arena.gameState.players[conn.playerId]) {
                            arena.gameState.players[conn.playerId].x = data.x;
                            arena.gameState.players[conn.playerId].y = data.y;
                        }

                        // Broadcast to others (no buffering!)
                        arena.broadcast({
                            type: 'playerMove',
                            playerId: conn.playerId,
                            x: data.x,
                            y: data.y
                        }, ws);
                        break;

                    case 'chat':
                        arena.broadcast({
                            type: 'chat',
                            playerId: conn.playerId,
                            playerName: conn.playerName,
                            message: data.message
                        });
                        break;

                    default:
                        // Echo other messages to arena
                        arena.broadcast(data, ws);
                }
            } catch (err) {
                console.error('[uWS] Message parse error:', err);
            }
        }
    },

    // Handle disconnection
    close: (ws, code, message) => {
        const conn = connections.get(ws);
        if (conn) {
            const arena = arenas.get(conn.arenaId);
            if (arena) {
                arena.removePlayer(ws, conn.playerId);

                // Notify others
                arena.broadcast({
                    type: 'playerDisconnect',
                    playerId: conn.playerId
                });

                console.log(`[uWS] Player ${conn.playerName} disconnected from ${conn.arenaId}`);

                // Clean up empty arenas
                if (arena.players.size === 0) {
                    arenas.delete(conn.arenaId);
                    console.log(`[uWS] Deleted empty arena: ${conn.arenaId}`);
                }
            }
            connections.delete(ws);
        }
    },

    // Handle dropped messages (backpressure)
    drain: (ws) => {
        console.log('[uWS] WebSocket backpressure cleared');
    }
});

// Start the server
const port = process.env.PORT || config.port || 8080;
app.listen(port, (token) => {
    if (token) {
        console.log(`[uWS] Server listening on port ${port}`);
        console.log('[uWS] Compression: DISABLED for lowest latency');
        console.log('[uWS] This is a minimal test server - game logic not yet implemented');
    } else {
        console.log(`[uWS] Failed to listen on port ${port}`);
    }
});

// Game loop (simplified for testing)
setInterval(() => {
    const now = Date.now();

    // Send updates to all arenas
    for (const [arenaId, arena] of arenas) {
        if (arena.players.size > 0) {
            // Create update message
            const update = {
                type: 'gameUpdate',
                timestamp: now,
                players: arena.gameState.players
            };

            // Send directly to all players (no buffering!)
            const data = JSON.stringify(update);
            for (const ws of arena.players) {
                if (ws.readyState === 1) {
                    ws.send(data);
                }
            }
        }
    }
}, 16); // 60Hz updates

console.log('[uWS] uWebSockets.js server initialized');
console.log('[uWS] This server bypasses Socket.IO entirely for minimal latency');