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
    // Prioritize WebSocket for real-time gaming, fallback to polling
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    // Performance optimizations for real-time multiplayer
    pingInterval: 25000,  // Send ping every 25s to detect disconnections
    pingTimeout: 20000,   // Consider connection dead if no pong after 20s
    upgradeTimeout: 30000, // Allow more time for WebSocket upgrade
    maxHttpBufferSize: 1e6, // 1MB buffer for large game state updates
    // Enable compression for update packets
    perMessageDeflate: {
        threshold: 1024 // Compress messages larger than 1KB
    }
});

const config = require('../../config');
const ArenaManager = require('./arena-manager');
const AuthService = require('./services/auth-service');
const UserRepository = require('./repositories/user-repository');
const StatsRepository = require('./repositories/stats-repository');
const PreferencesRepository = require('./repositories/preferences-repository');
const WalletRepository = require('./repositories/wallet-repository');

// Add middleware for JSON parsing
app.use(express.json());

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
app.use('/shared', express.static(__dirname + '/../shared'));

// API endpoint: Arena statistics
app.get('/api/arenas', (req, res) => {
    res.json(arenaManager.getStats());
});

// API endpoint: User authentication
app.post('/api/auth', async (req, res) => {
    try {
        console.log('[API] /api/auth request received:', {
            body: req.body,
            headers: req.headers['content-type']
        });

        const { privyId, email, username, authProvider, avatarUrl } = req.body;

        if (!privyId) {
            console.error('[API] Auth failed: Privy ID is missing');
            return res.status(400).json({ error: 'Privy ID is required' });
        }

        console.log('[API] Authenticating user with Privy ID:', privyId);

        const userData = await AuthService.authenticateUser({
            privyId,
            email,
            username,
            authProvider,
            avatarUrl
        });

        console.log('[API] Auth successful for user:', userData.user.id);
        res.json(userData);
    } catch (error) {
        console.error('[API] Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// API endpoint: Get user profile
app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await UserRepository.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = await StatsRepository.getUserStats(userId);
        const rank = await StatsRepository.getUserRank(userId);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                region: user.region,
                createdAt: user.created_at
            },
            stats: {
                ...stats,
                rank
            }
        });
    } catch (error) {
        console.error('[API] Get user error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// API endpoint: Update user preferences
app.put('/api/user/:userId/preferences', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const preferences = req.body;

        console.log('[API] Updating preferences for user', userId, ':', preferences);

        const success = await AuthService.updateUserPreferences(userId, preferences);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Failed to update preferences' });
        }
    } catch (error) {
        console.error('[API] Update preferences error:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// API endpoint: Get user preferences
app.get('/api/user/:userId/preferences', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const preferences = await PreferencesRepository.getPreferences(userId);

        console.log('[API] Retrieved preferences from DB for user', userId, ':', preferences);

        res.json({
            darkMode: !!preferences.dark_mode,
            showMass: !!preferences.show_mass,
            showBorder: !!preferences.show_border,
            showFps: !!preferences.show_fps,
            showGrid: !!preferences.show_grid,
            continuity: !!preferences.continuity,
            roundFood: !!preferences.round_food,
            soundEnabled: !!preferences.sound_enabled,
            musicEnabled: !!preferences.music_enabled,
            skinId: preferences.skin_id
        });
    } catch (error) {
        console.error('[API] Get preferences error:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

// API endpoint: Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const leaderboard = await StatsRepository.getLeaderboard(limit, offset);
        res.json(leaderboard);
    } catch (error) {
        console.error('[API] Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// API endpoint: Check username availability
app.get('/api/username/available/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const userId = req.query.userId ? parseInt(req.query.userId) : null;

        const available = await AuthService.checkUsernameAvailability(username, userId);
        res.json({ available });
    } catch (error) {
        console.error('[API] Check username error:', error);
        res.status(500).json({ error: 'Failed to check username' });
    }
});

// API endpoint: Update user profile
app.put('/api/user/:userId/profile', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const profileData = req.body;

        await AuthService.updateUserProfile(userId, profileData);
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Update profile error:', error);
        if (error.message === 'Username already taken') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
});

// Wallet API Endpoints

/**
 * Helper function to format balance with 6 decimal places
 * @param {string|number} balance - Balance to format
 * @returns {number} Formatted balance as number with 6 decimals
 */
function formatBalance(balance) {
    return parseFloat(parseFloat(balance).toFixed(6));
}

// API endpoint: Get user wallet balance
app.get('/api/user/:userId/wallet', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const wallet = await WalletRepository.getWalletByUserId(userId);

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        res.json({
            balance: formatBalance(wallet.balance),
            created_at: wallet.created_at,
            updated_at: wallet.updated_at
        });
    } catch (error) {
        console.error('[API] Get wallet error:', error);
        res.status(500).json({ error: 'Failed to retrieve wallet balance' });
    }
});

// API endpoint: Update user wallet balance
app.put('/api/user/:userId/wallet', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { balance } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (typeof balance !== 'number' || balance < 0) {
            return res.status(400).json({ error: 'Balance must be a non-negative number' });
        }

        const updatedWallet = await WalletRepository.updateBalance(userId, balance);

        res.json({
            balance: formatBalance(updatedWallet.balance),
            updated_at: updatedWallet.updated_at
        });
    } catch (error) {
        console.error('[API] Update wallet error:', error);

        if (error.message.includes('Wallet not found')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('negative balance')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to update wallet balance' });
        }
    }
});

// API endpoint: Add money to user wallet
app.post('/api/user/:userId/wallet/add', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { amount, description } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        const updatedWallet = await WalletRepository.addBalance(userId, amount);

        console.log(`[API] Added $${amount} to user ${userId} wallet${description ? ` (${description})` : ''}`);

        res.json({
            balance: formatBalance(updatedWallet.balance),
            amount_added: formatBalance(amount),
            description: description || 'Balance added',
            updated_at: updatedWallet.updated_at
        });
    } catch (error) {
        console.error('[API] Add wallet balance error:', error);

        if (error.message.includes('Wallet not found')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('Amount must be positive')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to add balance' });
        }
    }
});

// API endpoint: Subtract money from user wallet
app.post('/api/user/:userId/wallet/subtract', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { amount, description } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        const updatedWallet = await WalletRepository.subtractBalance(userId, amount);

        console.log(`[API] Subtracted $${amount} from user ${userId} wallet${description ? ` (${description})` : ''}`);

        res.json({
            balance: formatBalance(updatedWallet.balance),
            amount_subtracted: formatBalance(amount),
            description: description || 'Balance deducted',
            updated_at: updatedWallet.updated_at
        });
    } catch (error) {
        console.error('[API] Subtract wallet balance error:', error);

        if (error.message.includes('Insufficient balance')) {
            res.status(400).json({ error: error.message });
        } else if (error.message.includes('Wallet not found')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('Amount must be positive')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to subtract balance' });
        }
    }
});

// API endpoint: Transfer money between users
app.post('/api/wallet/transfer', async (req, res) => {
    try {
        const { fromUserId, toUserId, amount, description } = req.body;

        if (!fromUserId || !toUserId || isNaN(fromUserId) || isNaN(toUserId)) {
            return res.status(400).json({ error: 'Valid fromUserId and toUserId are required' });
        }

        if (fromUserId === toUserId) {
            return res.status(400).json({ error: 'Cannot transfer to the same user' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        const transfer = await WalletRepository.transferBalance(
            parseInt(fromUserId),
            parseInt(toUserId),
            amount
        );

        console.log(`[API] Transferred $${amount} from user ${fromUserId} to user ${toUserId}${description ? ` (${description})` : ''}`);

        res.json({
            success: true,
            amount_transferred: formatBalance(amount),
            description: description || 'Balance transfer',
            from_wallet: {
                user_id: fromUserId,
                new_balance: formatBalance(transfer.fromWallet.balance)
            },
            to_wallet: {
                user_id: toUserId,
                new_balance: formatBalance(transfer.toWallet.balance)
            }
        });
    } catch (error) {
        console.error('[API] Transfer wallet balance error:', error);

        if (error.message.includes('Insufficient balance')) {
            res.status(400).json({ error: error.message });
        } else if (error.message.includes('wallet not found')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('Amount must be positive')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to transfer balance' });
        }
    }
});

// API endpoint: Get wallet leaderboard
app.get('/api/wallet/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        if (limit < 1 || limit > 100) {
            return res.status(400).json({ error: 'Limit must be between 1 and 100' });
        }

        const topWallets = await WalletRepository.getTopWallets(limit);

        res.json({
            leaderboard: topWallets.map((wallet, index) => ({
                rank: index + 1,
                username: wallet.username,
                balance: formatBalance(wallet.balance),
                avatar_url: wallet.avatar_url
            }))
        });
    } catch (error) {
        console.error('[API] Get wallet leaderboard error:', error);
        res.status(500).json({ error: 'Failed to retrieve wallet leaderboard' });
    }
});

// API endpoint: Get wallet statistics
app.get('/api/wallet/stats', async (req, res) => {
    try {
        const stats = await WalletRepository.getWalletStats();

        res.json({
            total_wallets: parseInt(stats.total_wallets),
            total_balance: formatBalance(stats.total_balance || 0),
            average_balance: formatBalance(stats.average_balance || 0),
            min_balance: formatBalance(stats.min_balance || 0),
            max_balance: formatBalance(stats.max_balance || 0)
        });
    } catch (error) {
        console.error('[API] Get wallet stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve wallet statistics' });
    }
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
const addPlayerToArena = async (socket) => {
    // Check if player is respawning (has preferred arena)
    const preferredArenaId = socket.handshake.query.arenaId || null;
    const userId = socket.handshake.query.userId || null;
    const privyId = socket.handshake.query.privyId || null;
    const playerName = socket.handshake.query.playerName || `Guest_${Math.floor(Math.random() * 10000)}`;

    // Store user info on socket for arena type determination
    socket.userId = userId ? parseInt(userId) : null;
    socket.privyId = privyId;
    socket.playerName = playerName;

    // Find or create arena (pass socket to determine paid vs free)
    const arena = arenaManager.findAvailableArena(preferredArenaId, socket);

    // Store arena ID on socket BEFORE joining room
    socket.arenaId = arena.id;

    // TODO: Fix session tracking - temporarily disabled to fix black screen issue
    // Session creation works but causes immediate disconnects for logged-in users
    // Needs investigation into the disconnect flow
    /*
    // Start game session if authenticated user
    if (socket.userId) {
        try {
            const sessionId = await AuthService.startGameSession(socket.userId, arena.id, playerName);
            socket.sessionId = sessionId;
            console.log(`[SERVER] Started session ${sessionId} for user ${socket.userId}`);
        } catch (error) {
            console.error('[SERVER] Failed to start game session:', error);
        }
    }
    */

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
