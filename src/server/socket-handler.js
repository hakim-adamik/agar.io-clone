/**
 * Server-Side Socket Handler
 *
 * Handles binary protocol communication with clients.
 * Isolates socket.io logic from game logic.
 */

'use strict';

const { OPCODES } = require('../shared/protocol');
const { Encoder, Decoder } = require('../shared/binary-codec');

/**
 * Socket Handler Class
 * Manages binary communication for a single socket connection
 */
class SocketHandler {
    constructor(socket) {
        this.socket = socket;
        this.handlers = new Map();

        // Set up binary message handler
        this.socket.on('binary', (data) => this.handleBinaryMessage(data));
    }

    /**
     * Handle incoming binary message
     */
    handleBinaryMessage(buffer) {
        try {
            console.log('[SocketHandler] Received binary message, length:', buffer.byteLength || buffer.length);
            const { opcode, data } = Decoder.decode(buffer);
            console.log('[SocketHandler] Decoded opcode:', opcode);

            // Call registered handler for this opcode
            const handler = this.handlers.get(opcode);
            if (handler) {
                console.log('[SocketHandler] Calling handler for opcode:', opcode);
                handler(data);
            } else {
                console.warn(`[SocketHandler] No handler for opcode: ${opcode}`);
            }
        } catch (error) {
            console.error('[SocketHandler] Error decoding message:', error, error.stack);
        }
    }

    /**
     * Register handler for a specific opcode
     */
    on(opcode, handler) {
        this.handlers.set(opcode, handler);
    }

    /**
     * Send binary message to client
     */
    send(buffer) {
        console.log('[SocketHandler] Sending binary message, length:', buffer.byteLength);
        this.socket.emit('binary', buffer);
    }

    /**
     * Convenience methods for sending specific messages
     */

    sendWelcome(playerSettings, gameSizes) {
        const buffer = Encoder.encodeWelcome(playerSettings, gameSizes);
        this.send(buffer);
    }

    sendGameUpdate(playerData, visiblePlayers, visibleFood, visibleMass, visibleViruses) {
        const buffer = Encoder.encodeGameUpdate(
            playerData,
            visiblePlayers,
            visibleFood,
            visibleMass,
            visibleViruses
        );
        this.send(buffer);
    }

    sendLeaderboard(data) {
        const buffer = Encoder.encodeLeaderboard(data);
        this.send(buffer);
    }

    sendRip() {
        const buffer = Encoder.encodeRip();
        this.send(buffer);
    }

    sendPlayerDied(data) {
        const buffer = Encoder.encodePlayerDied(data);
        this.send(buffer);
    }

    sendPlayerDisconnect(data) {
        const buffer = Encoder.encodePlayerDisconnect(data);
        this.send(buffer);
    }

    sendPlayerJoin(data) {
        const buffer = Encoder.encodePlayerJoin(data);
        this.send(buffer);
    }

    sendPlayerEaten(data) {
        const buffer = Encoder.encodePlayerEaten(data);
        this.send(buffer);
    }

    sendPong() {
        const buffer = Encoder.encodePong();
        this.send(buffer);
    }

    sendKick(reason) {
        const buffer = Encoder.encodeKick(reason);
        this.send(buffer);
    }

    sendServerMsg(message) {
        const buffer = Encoder.encodeServerMsg(message);
        this.send(buffer);
    }

    /**
     * Access underlying socket for special operations
     */
    getSocket() {
        return this.socket;
    }

    disconnect() {
        this.socket.disconnect();
    }
}

/**
 * Broadcast Handler - for sending to multiple sockets
 */
class BroadcastHandler {
    constructor(io, roomId) {
        this.io = io;
        this.roomId = roomId;
    }

    /**
     * Broadcast binary message to all clients in room
     */
    broadcast(buffer) {
        this.io.to(this.roomId).emit('binary', buffer);
    }

    broadcastPlayerDied(data) {
        const buffer = Encoder.encodePlayerDied(data);
        this.broadcast(buffer);
    }

    broadcastPlayerDisconnect(data) {
        const buffer = Encoder.encodePlayerDisconnect(data);
        this.broadcast(buffer);
    }

    broadcastPlayerJoin(data) {
        const buffer = Encoder.encodePlayerJoin(data);
        this.broadcast(buffer);
    }

    broadcastServerMsg(message) {
        const buffer = Encoder.encodeServerMsg(message);
        this.broadcast(buffer);
    }
}

module.exports = {
    SocketHandler,
    BroadcastHandler,
    OPCODES
};

