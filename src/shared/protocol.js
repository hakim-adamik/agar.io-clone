/**
 * Binary Protocol Definition
 *
 * This file defines the binary packet format for client-server communication.
 * Socket.io will transport these binary packets while maintaining its reliability features.
 *
 * Packet Structure:
 * [opcode:1byte][payload:variable]
 */

'use strict';

// Message Type Opcodes (0-255)
const OPCODES = {
    // Client → Server (0-99)
    C2S_RESPAWN: 0,
    C2S_GOTIT: 1,
    C2S_MOVEMENT: 2,          // Movement target (was "0")
    C2S_EJECT: 3,             // Eject mass (was "1")
    C2S_SPLIT: 4,             // Split cells (was "2")
    C2S_PING: 5,              // Ping check
    C2S_WINDOW_RESIZE: 6,     // Window resized
    C2S_ADMIN_LOGIN: 7,       // Admin password
    C2S_ADMIN_KICK: 8,        // Kick player

    // Server → Client (100-199)
    S2C_WELCOME: 100,
    S2C_GAME_UPDATE: 101,     // Main game state update (was "serverTellPlayerMove")
    S2C_LEADERBOARD: 102,
    S2C_RIP: 103,             // Player died
    S2C_PLAYER_DIED: 104,     // Another player died
    S2C_PLAYER_DISCONNECT: 105,
    S2C_PLAYER_JOIN: 106,
    S2C_PLAYER_EATEN: 107,    // You ate someone
    S2C_PONG: 108,            // Pong response
    S2C_KICK: 109,            // You're being kicked
    S2C_SERVER_MSG: 110,      // Server message

    // Reserved for future use (200-255)
};

// Reverse lookup for debugging
const OPCODE_NAMES = Object.fromEntries(
    Object.entries(OPCODES).map(([k, v]) => [v, k])
);

// Get opcode name for debugging
function getOpcodeName(opcode) {
    return OPCODE_NAMES[opcode] || `UNKNOWN(${opcode})`;
}

module.exports = {
    OPCODES,
    OPCODE_NAMES,
    getOpcodeName
};

