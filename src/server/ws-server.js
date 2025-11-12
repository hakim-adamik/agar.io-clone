/*jslint bitwise: true, node: true */
'use strict';

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

// Create Express app for HTTP
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({
    server,
    perMessageDeflate: false, // IMPORTANT: Disable compression for lowest latency
    clientTracking: true
});

// Store connections and game state
const connections = new Map(); // ws -> {playerId, arenaId, playerName, etc}
const arenas = new Map(); // arenaId -> {players: Set, gameState: {}}

// Simple arena management
class Arena {
    constructor(id) {
        this.id = id;
        this.players = new Set();
        this.gameState = {
            players: {},
            foods: [],
            viruses: [],
            timestamp: Date.now()
        };
    }

    addPlayer(ws, playerId, playerName) {
        this.players.add(ws);
        this.gameState.players[playerId] = {
            id: playerId,
            name: playerName,
            x: Math.random() * 5000,
            y: Math.random() * 5000,
            cells: [{
                x: Math.random() * 5000,
                y: Math.random() * 5000,
                mass: config.defaultPlayerMass || 10,
                radius: 10
            }],
            hue: Math.random() * 360,
            massTotal: config.defaultPlayerMass || 10,
            score: 0
        };
    }

    removePlayer(ws, playerId) {
        this.players.delete(ws);
        delete this.gameState.players[playerId];
    }

    broadcast(message, exclude) {
        const data = typeof message === 'string' ? message : JSON.stringify(message);

        for (const ws of this.players) {
            if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
                // Send immediately without buffering
                ws.send(data, (err) => {
                    if (err) console.error('[WS] Send error:', err);
                });
            }
        }
    }

    sendToAll(message) {
        const data = typeof message === 'string' ? message : JSON.stringify(message);

        for (const ws of this.players) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data, (err) => {
                    if (err) console.error('[WS] Send error:', err);
                });
            }
        }
    }
}

// HTTP routes
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '/../client/index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading page');
            return;
        }
        // Inject WebSocket info
        const wsScript = `
        <script>
            window.WS_PORT = ${config.port || 8080};
            window.USE_RAW_WEBSOCKET = true;
        </script>`;
        const modifiedHtml = data.replace('</head>', `${wsScript}\n    </head>`);
        res.send(modifiedHtml);
    });
});

app.use(express.static(path.join(__dirname, '/../client')));
app.use('/shared', express.static(path.join(__dirname, '/../shared')));

// WebSocket handling
wss.on('connection', (ws, req) => {
    console.log('[WS] New connection');

    // Parse URL params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = Object.fromEntries(url.searchParams);

    const playerId = Math.random().toString(36).substr(2, 9);
    const playerName = params.playerName || `Guest_${Math.floor(Math.random() * 10000)}`;
    const arenaId = params.arenaId || 'arena_1';

    // Create or get arena
    if (!arenas.has(arenaId)) {
        arenas.set(arenaId, new Arena(arenaId));
        console.log(`[WS] Created arena: ${arenaId}`);
    }

    const arena = arenas.get(arenaId);

    // Store connection info
    const connInfo = {
        playerId,
        playerName,
        arenaId,
        lastUpdate: Date.now(),
        lastInput: null
    };
    connections.set(ws, connInfo);

    // Configure socket for low latency
    if (ws._socket) {
        ws._socket.setNoDelay(true); // Disable Nagle's algorithm
        ws._socket.setKeepAlive(true, 1000); // Keep alive every second
    }

    // Add player to arena
    arena.addPlayer(ws, playerId, playerName);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        playerId,
        arenaId,
        gameConfig: {
            screenWidth: config.screenWidth,
            screenHeight: config.screenHeight,
            gameWidth: config.gameWidth,
            gameHeight: config.gameHeight
        }
    }));

    console.log(`[WS] Player ${playerName} (${playerId}) joined ${arenaId}`);

    // Handle messages
    ws.on('message', (data) => {
        const conn = connections.get(ws);
        if (!conn) return;

        const arena = arenas.get(conn.arenaId);
        if (!arena) return;

        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'respawn':
                    // Handle respawn
                    arena.gameState.players[conn.playerId] = {
                        id: conn.playerId,
                        name: conn.playerName,
                        x: Math.random() * 5000,
                        y: Math.random() * 5000,
                        cells: [{
                            x: Math.random() * 5000,
                            y: Math.random() * 5000,
                            mass: config.defaultPlayerMass || 10,
                            radius: 10
                        }],
                        hue: Math.random() * 360,
                        massTotal: config.defaultPlayerMass || 10,
                        score: 0
                    };
                    break;

                case '0': // Move (using Socket.IO naming for compatibility)
                case 'move':
                    // Store input for next update
                    conn.lastInput = {
                        x: message.x,
                        y: message.y
                    };
                    break;

                case '1': // Split
                case 'split':
                    // Handle split
                    break;

                case '2': // Eject
                case 'eject':
                    // Handle eject
                    break;

                case 'chat':
                    arena.broadcast({
                        type: 'chat',
                        playerId: conn.playerId,
                        playerName: conn.playerName,
                        message: message.message
                    });
                    break;
            }
        } catch (err) {
            console.error('[WS] Message parse error:', err);
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        const conn = connections.get(ws);
        if (conn) {
            const arena = arenas.get(conn.arenaId);
            if (arena) {
                arena.removePlayer(ws, conn.playerId);
                arena.broadcast({
                    type: 'playerDisconnect',
                    playerId: conn.playerId
                });

                console.log(`[WS] Player ${conn.playerName} disconnected from ${conn.arenaId}`);

                // Clean up empty arenas
                if (arena.players.size === 0) {
                    arenas.delete(conn.arenaId);
                    console.log(`[WS] Deleted empty arena: ${conn.arenaId}`);
                }
            }
            connections.delete(ws);
        }
    });

    ws.on('error', (err) => {
        console.error('[WS] WebSocket error:', err);
    });
});

// Game update loop - send updates at 60Hz
setInterval(() => {
    const now = Date.now();

    for (const [arenaId, arena] of arenas) {
        if (arena.players.size === 0) continue;

        // Update game state based on inputs
        for (const ws of arena.players) {
            const conn = connections.get(ws);
            if (conn && conn.lastInput) {
                const player = arena.gameState.players[conn.playerId];
                if (player) {
                    // Simple movement towards target
                    const dx = conn.lastInput.x - player.x;
                    const dy = conn.lastInput.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 1) {
                        const speed = 5; // Simple fixed speed for testing
                        player.x += (dx / dist) * speed;
                        player.y += (dy / dist) * speed;

                        // Update cells
                        if (player.cells && player.cells[0]) {
                            player.cells[0].x = player.x;
                            player.cells[0].y = player.y;
                        }
                    }
                }
            }
        }

        // Send individual updates to each player with their viewport
        for (const ws of arena.players) {
            if (ws.readyState !== WebSocket.OPEN) continue;

            const conn = connections.get(ws);
            if (!conn) continue;

            const player = arena.gameState.players[conn.playerId];
            if (!player) continue;

            // Create personalized update for this player
            const update = {
                type: 'serverTellPlayerMove',
                timestamp: now,
                // Send player's own data
                playerData: player,
                // Send other players as userData
                userData: Object.values(arena.gameState.players).filter(p => p.id !== conn.playerId),
                // Send food, viruses, etc (empty for now)
                foods: [],
                masses: [],
                viruses: []
            };

            // Convert to Socket.IO compatible format
            const message = JSON.stringify({
                type: 'serverTellPlayerMove',
                players: [player],  // Current player first
                userData: update.userData,
                foods: update.foods,
                masses: update.masses,
                viruses: update.viruses
            });

            // Send IMMEDIATELY - no buffering!
            ws.send(message, (err) => {
                if (err) console.error('[WS] Send error:', err);
            });
        }
    }
}, 16); // 60Hz (16.67ms)

// Performance monitoring
let lastUpdate = Date.now();
setInterval(() => {
    const now = Date.now();
    const delta = now - lastUpdate;

    if (delta > 50) {
        console.warn(`[WS] Server loop stall: ${delta}ms`);
    }

    lastUpdate = now;
}, 16);

// Start server
const port = process.env.PORT || config.port || 8080;
server.listen(port, () => {
    console.log(`[WS] Pure WebSocket server listening on port ${port}`);
    console.log('[WS] Compression: DISABLED');
    console.log('[WS] Nagle: DISABLED (TCP_NODELAY enabled)');
    console.log('[WS] This bypasses Socket.IO completely for minimal latency');
});

console.log('[WS] Starting pure WebSocket server...');
console.log('[WS] This should eliminate the 135ms stalls from Socket.IO buffering');