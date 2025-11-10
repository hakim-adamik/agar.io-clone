/*jslint bitwise: true, node: true */
'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

const config = require('../../config');
const ArenaManager = require('./arena-manager');

// Initialize arena manager (replaces single map)
const arenaManager = new ArenaManager(config, io);

// Create initial arena on startup
arenaManager.createArena();

console.log('[SERVER] Multi-arena system initialized');

// Serve index.html with injected environment variables
const fs = require('fs');
const path = require('path');

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '/../client/index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            res.status(500).send('Error loading page');
            return;
        }

        // Inject environment variables and config into the HTML
        const envScript = `
        <script>
            window.ENV = {
                PRIVY_APP_ID: '${process.env.PRIVY_APP_ID || ''}',
                DEBUG_SHOW_CELL_MASS: ${process.env.DEBUG_SHOW_CELL_MASS || false}
            };
        </script>`;

        // Insert the script before the closing </head> tag
        const modifiedHtml = data.replace('</head>', `${envScript}\n    </head>`);
        res.send(modifiedHtml);
    });
});

app.use(express.static(__dirname + '/../client'));

// API endpoint: Arena statistics
app.get('/api/arenas', (req, res) => {
    res.json(arenaManager.getStats());
});

io.on('connection', function (socket) {
    let type = socket.handshake.query.type;
    console.log('[SERVER] User connected: ', type);

    switch (type) {
        case 'player':
            addPlayerToArena(socket);
            break;
        case 'spectator':
            addSpectatorToArena(socket);
            break;
        default:
            console.log('[SERVER] Unknown user type, not doing anything.');
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

    // Store arena ID on socket BEFORE joining room
    socket.arenaId = arena.id;

    // Join Socket.io room
    socket.join(arena.id);

    // Delegate to arena (this will set up all event handlers)
    arena.addPlayer(socket);

    // Log global stats (use actual current count, not getPlayerCount which might be stale)
    const stats = arenaManager.getStats();
    console.log(
        `[SERVER] Player joined ${arena.id} (${arena.map.players.data.length}/${config.maxPlayersPerArena}). ` +
        `Total: ${stats.totalPlayers} players across ${stats.totalArenas} arenas`
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

    console.log(`[SERVER] Spectator joined ${arena.id}`);
};

// Cleanup empty arenas every 5 minutes
setInterval(() => {
    arenaManager.cleanupEmptyArenas();
}, 300000);

// Server stats logging every 30 seconds
setInterval(() => {
    const stats = arenaManager.getStats();
    if (stats.totalPlayers > 0) {
        console.log(`[SERVER] Arenas: ${stats.totalArenas}, Players: ${stats.totalPlayers}, Spectators: ${stats.totalSpectators}`);
    }
}, 30000);

// Start server
const ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || config.host;
const serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || config.port;
http.listen(serverport, ipaddress, () => console.log('[SERVER] Listening on ' + ipaddress + ':' + serverport));
