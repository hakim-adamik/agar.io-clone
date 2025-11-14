/**
 * Socket Manager
 * Handles all socket.io communication with the server
 */

var io = require("socket.io-client");
var global = require("./global");
var render = require("./render");

var socket = null;

// Export socket for external access
exports.getSocket = function() {
    return socket;
};

/**
 * Create and connect a new socket
 */
exports.connect = function(playerName, type, userData, callback) {
    // Build query params including user data
    const queryParams = {
        type: type,
        arenaId: global.arenaId || null,
        userId: userData?.dbUserId || null,
        playerName: playerName || userData?.username || `Guest_${Math.floor(Math.random() * 10000)}`
    };

    // Convert to query string
    const query = Object.keys(queryParams)
        .filter(key => queryParams[key] !== null)
        .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join("&");

    // Clean up any existing connection
    if (socket) {
        console.log("[Socket] Cleaning up previous connection");
        socket.disconnect();
        socket = null;

        // Small delay to ensure cleanup completes
        setTimeout(() => {
            createNewSocket();
        }, 100);
        return;
    }

    createNewSocket();

    function createNewSocket() {
        // Socket.io configuration optimized for real-time gaming
        socket = io({
            query: query,
            // Prioritize WebSocket, fallback to polling
            transports: ['websocket', 'polling'],
            // Reconnection settings
            reconnection: true,
            reconnectionDelay: 1000,      // Start with 1s delay
            reconnectionDelayMax: 5000,   // Max 5s between attempts
            reconnectionAttempts: 10,     // Try 10 times before giving up
            // Timeouts
            timeout: 20000,               // 20s connection timeout
            // Upgrade settings
            upgrade: true,
            rememberUpgrade: true,
            // Ping/pong already configured server-side
        });

        // Store socket globally for canvas access
        window.canvas.socket = socket;
        global.socket = socket;

        if (callback) callback(socket);
    }

    return socket;
};

/**
 * Disconnect the current socket
 */
exports.disconnect = function() {
    if (socket) {
        socket.disconnect();
        socket = null;
        window.canvas.socket = null;
        global.socket = null;
    }
};

/**
 * Emit event to server
 */
exports.emit = function(event, data) {
    if (socket) {
        socket.emit(event, data);
    }
};

/**
 * Register event handler
 */
exports.on = function(event, handler) {
    if (socket) {
        socket.on(event, handler);
    }
};

/**
 * Remove event handler
 */
exports.off = function(event, handler) {
    if (socket) {
        socket.off(event, handler);
    }
};

/**
 * Setup connection event handlers
 */
exports.setupConnectionHandlers = function(socket) {
    socket.on("connect", function() {
        console.log("[Socket] Connected successfully");
        // Hide any connection error messages
        if (global.connectionErrorShown) {
            global.connectionErrorShown = false;
        }
    });

    socket.on("reconnect", function(attemptNumber) {
        console.log("[Socket] Reconnected after " + attemptNumber + " attempts");
        // Optionally show success message briefly
        if (global.gameStart) {
            // Request fresh game state after reconnection
            socket.emit("respawn");
        }
    });

    socket.on("reconnect_attempt", function(attemptNumber) {
        console.log("[Socket] Reconnection attempt #" + attemptNumber);
        if (!global.connectionErrorShown && global.gameStart) {
            render.drawErrorMessage("Reconnecting...", window.graph, global.screen);
            global.connectionErrorShown = true;
        }
    });

    socket.on("reconnect_failed", function() {
        console.log("[Socket] Reconnection failed after all attempts");
        render.drawErrorMessage("Connection Lost - Please Refresh", window.graph, global.screen);
    });

    socket.on("connect_error", function(error) {
        console.error("[Socket] Connection error:", error.message);
        // Don't immediately show disconnect message - let reconnection try first
        if (socket.io.reconnecting === false) {
            handleDisconnect();
        }
    });

    // Handle ping
    socket.on("pongcheck", function() {
        var latency = Date.now() - global.startPingTime;
        console.log("Latency: " + latency + "ms");
    });
};

// Helper function for disconnect handling
function handleDisconnect() {
    if (!global.kicked) {
        render.drawErrorMessage("Disconnected!", window.graph, global.screen);
    }
}