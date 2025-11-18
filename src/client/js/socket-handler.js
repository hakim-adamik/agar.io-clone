/**
 * Client-Side Socket Handler
 *
 * Handles binary protocol communication with server.
 * Isolates socket.io logic from game logic.
 */

const { OPCODES } = require('../../shared/protocol');
const { Encoder, Decoder } = require('../../shared/binary-codec');

/**
 * Client Socket Handler
 * Wraps socket.io connection with binary protocol layer
 */
class ClientSocketHandler {
    constructor(socket) {
        this.socket = socket;
        this.handlers = new Map();

        // Set up binary message handler
        this.socket.on('binary', (data) => this.handleBinaryMessage(data));
    }

    /**
     * Handle incoming binary message from server
     */
    handleBinaryMessage(buffer) {
        try {
            console.log('[ClientSocket] Received binary message, type:', typeof buffer, 'length:', buffer.byteLength || buffer.length);
            const { opcode, data } = Decoder.decode(buffer);
            console.log('[ClientSocket] Decoded opcode:', opcode);

            // Call registered handler for this opcode
            const handler = this.handlers.get(opcode);
            if (handler) {
                console.log('[ClientSocket] Calling handler for opcode:', opcode);
                handler(data);
            } else {
                console.warn(`[ClientSocket] No handler for opcode: ${opcode}`);
            }
        } catch (error) {
            console.error('[ClientSocket] Error decoding message:', error, error.stack);
        }
    }

    /**
     * Register handler for a specific server message
     */
    on(opcode, handler) {
        this.handlers.set(opcode, handler);
        return this;
    }

    /**
     * Forward connection-related events from underlying socket
     */
    onConnect(handler) {
        this.socket.on('connect', handler);
        return this;
    }

    onDisconnect(handler) {
        this.socket.on('disconnect', handler);
        return this;
    }

    onReconnect(handler) {
        this.socket.on('reconnect', handler);
        return this;
    }

    onReconnectAttempt(handler) {
        this.socket.on('reconnect_attempt', handler);
        return this;
    }

    onReconnectFailed(handler) {
        this.socket.on('reconnect_failed', handler);
        return this;
    }

    onConnectError(handler) {
        this.socket.on('connect_error', handler);
        return this;
    }

    /**
     * Send binary message to server
     */
    send(buffer) {
        this.socket.emit('binary', buffer);
    }

    /**
     * Convenience methods for sending specific messages to server
     */

    sendRespawn() {
        const buffer = Encoder.encodeRespawn();
        this.send(buffer);
    }

    sendGotit(playerData) {
        const buffer = Encoder.encodeGotit(playerData);
        this.send(buffer);
    }

    sendMovement(target) {
        const buffer = Encoder.encodeMovement(target);
        this.send(buffer);
    }

    sendEject() {
        const buffer = Encoder.encodeEject();
        this.send(buffer);
    }

    sendSplit() {
        const buffer = Encoder.encodeSplit();
        this.send(buffer);
    }

    sendPing() {
        const buffer = Encoder.encodePing();
        this.send(buffer);
    }

    sendWindowResize(data) {
        const buffer = Encoder.encodeWindowResize(data);
        this.send(buffer);
    }

    sendAdminLogin(password) {
        const buffer = Encoder.encodeAdminLogin([password]);
        this.send(buffer);
    }

    sendAdminKick(data) {
        const buffer = Encoder.encodeAdminKick(data);
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

module.exports = {
    ClientSocketHandler,
    OPCODES
};

