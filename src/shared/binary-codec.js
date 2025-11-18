/**
 * Binary Codec for Game Protocol
 *
 * Provides encoding and decoding utilities for binary packet serialization.
 * Uses DataView for efficient binary operations with proper endianness.
 */

'use strict';

const { OPCODES } = require('./protocol');

/**
 * Binary Writer - Helper for building binary packets
 */
class BinaryWriter {
    constructor(initialSize = 1024) {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
        this.offset = 0;
    }

    ensureCapacity(additionalBytes) {
        const required = this.offset + additionalBytes;
        if (required > this.buffer.byteLength) {
            const newSize = Math.max(required, this.buffer.byteLength * 2);
            const newBuffer = new ArrayBuffer(newSize);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }

    writeUint8(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
        return this;
    }

    writeUint16(value) {
        this.ensureCapacity(2);
        this.view.setUint16(this.offset, value, true); // little-endian
        this.offset += 2;
        return this;
    }

    writeUint32(value) {
        this.ensureCapacity(4);
        this.view.setUint32(this.offset, value, true); // little-endian
        this.offset += 4;
        return this;
    }

    writeFloat32(value) {
        this.ensureCapacity(4);
        this.view.setFloat32(this.offset, value, true); // little-endian
        this.offset += 4;
        return this;
    }

    writeFloat64(value) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.offset, value, true); // little-endian
        this.offset += 8;
        return this;
    }

    writeString(str) {
        const encoded = new TextEncoder().encode(str);
        this.writeUint16(encoded.length);
        this.ensureCapacity(encoded.length);
        new Uint8Array(this.buffer, this.offset).set(encoded);
        this.offset += encoded.length;
        return this;
    }

    writeBoolean(value) {
        return this.writeUint8(value ? 1 : 0);
    }

    toBuffer() {
        return this.buffer.slice(0, this.offset);
    }
}

/**
 * Binary Reader - Helper for reading binary packets
 */
class BinaryReader {
    constructor(buffer) {
        // Handle both Node.js Buffer and browser ArrayBuffer
        if (buffer instanceof ArrayBuffer) {
            this.buffer = buffer;
            this.view = new DataView(buffer);
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
            // Node.js Buffer - convert to ArrayBuffer
            this.buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.view = new DataView(this.buffer);
        } else if (buffer.buffer instanceof ArrayBuffer) {
            // TypedArray view
            this.buffer = buffer.buffer;
            this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } else {
            throw new Error('BinaryReader requires ArrayBuffer or Buffer');
        }
        this.offset = 0;
    }

    readUint8() {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    readUint16() {
        const value = this.view.getUint16(this.offset, true); // little-endian
        this.offset += 2;
        return value;
    }

    readUint32() {
        const value = this.view.getUint32(this.offset, true); // little-endian
        this.offset += 4;
        return value;
    }

    readFloat32() {
        const value = this.view.getFloat32(this.offset, true); // little-endian
        this.offset += 4;
        return value;
    }

    readFloat64() {
        const value = this.view.getFloat64(this.offset, true); // little-endian
        this.offset += 8;
        return value;
    }

    readString() {
        const length = this.readUint16();
        const bytes = new Uint8Array(this.buffer, this.offset, length);
        this.offset += length;
        return new TextDecoder().decode(bytes);
    }

    readBoolean() {
        return this.readUint8() !== 0;
    }

    hasMore() {
        return this.offset < this.buffer.byteLength;
    }
}

/**
 * Encoder - Convert message objects to binary packets
 */
class Encoder {
    /**
     * C2S_RESPAWN - No data
     */
    static encodeRespawn() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.C2S_RESPAWN);
        return writer.toBuffer();
    }

    /**
     * C2S_GOTIT - Player initialization data
     * { name: string, hue: number, screenWidth: number, screenHeight: number }
     */
    static encodeGotit(playerData) {
        const writer = new BinaryWriter(256);
        writer.writeUint8(OPCODES.C2S_GOTIT);
        writer.writeString(playerData.name);
        writer.writeUint16(playerData.hue);
        writer.writeUint16(playerData.screenWidth);
        writer.writeUint16(playerData.screenHeight);
        return writer.toBuffer();
    }

    /**
     * C2S_MOVEMENT - Movement target
     * { x: number, y: number }
     */
    static encodeMovement(target) {
        const writer = new BinaryWriter(9);
        writer.writeUint8(OPCODES.C2S_MOVEMENT);
        writer.writeFloat32(target.x);
        writer.writeFloat32(target.y);
        return writer.toBuffer();
    }

    /**
     * C2S_EJECT - No data
     */
    static encodeEject() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.C2S_EJECT);
        return writer.toBuffer();
    }

    /**
     * C2S_SPLIT - No data
     */
    static encodeSplit() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.C2S_SPLIT);
        return writer.toBuffer();
    }

    /**
     * C2S_PING - No data
     */
    static encodePing() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.C2S_PING);
        return writer.toBuffer();
    }

    /**
     * C2S_WINDOW_RESIZE - Window dimensions
     * { screenWidth: number, screenHeight: number }
     */
    static encodeWindowResize(data) {
        const writer = new BinaryWriter(5);
        writer.writeUint8(OPCODES.C2S_WINDOW_RESIZE);
        writer.writeUint16(data.screenWidth);
        writer.writeUint16(data.screenHeight);
        return writer.toBuffer();
    }

    /**
     * C2S_ADMIN_LOGIN - Admin password
     * data: string[]
     */
    static encodeAdminLogin(data) {
        const writer = new BinaryWriter(256);
        writer.writeUint8(OPCODES.C2S_ADMIN_LOGIN);
        writer.writeString(data[0]); // password
        return writer.toBuffer();
    }

    /**
     * C2S_ADMIN_KICK - Kick player
     * data: string[] (playerName, reason...)
     */
    static encodeAdminKick(data) {
        const writer = new BinaryWriter(512);
        writer.writeUint8(OPCODES.C2S_ADMIN_KICK);
        writer.writeString(data[0]); // player name
        // Combine remaining args as reason
        const reason = data.slice(1).join(' ');
        writer.writeString(reason);
        return writer.toBuffer();
    }

    /**
     * S2C_WELCOME - Welcome message with player and game config
     * playerSettings: Player object
     * gameSizes: { width, height, arenaId }
     */
    static encodeWelcome(playerSettings, gameSizes) {
        const writer = new BinaryWriter(512);
        writer.writeUint8(OPCODES.S2C_WELCOME);

        // Player settings
        writer.writeString(playerSettings.id || '');
        writer.writeString(playerSettings.name || '');
        writer.writeFloat32(playerSettings.x || 0);
        writer.writeFloat32(playerSettings.y || 0);
        writer.writeUint16(playerSettings.hue || 0);
        writer.writeUint16(playerSettings.screenWidth || 0);
        writer.writeUint16(playerSettings.screenHeight || 0);

        // Game sizes
        writer.writeUint32(gameSizes.width);
        writer.writeUint32(gameSizes.height);
        writer.writeString(gameSizes.arenaId || '');

        return writer.toBuffer();
    }

    /**
     * S2C_GAME_UPDATE - Main game state update
     * This is the most complex and frequent message
     */
    static encodeGameUpdate(playerData, visiblePlayers, visibleFood, visibleMass, visibleViruses) {
        const writer = new BinaryWriter(8192); // Start with larger buffer for efficiency
        writer.writeUint8(OPCODES.S2C_GAME_UPDATE);

        // Player data
        writer.writeString(playerData.id);
        writer.writeString(playerData.name);
        writer.writeFloat32(playerData.x);
        writer.writeFloat32(playerData.y);
        writer.writeFloat32(playerData.massTotal);
        writer.writeUint16(playerData.hue);

        // Player cells
        writer.writeUint16(playerData.cells.length);
        for (const cell of playerData.cells) {
            writer.writeFloat32(cell.x);
            writer.writeFloat32(cell.y);
            writer.writeFloat32(cell.mass);
            writer.writeFloat32(cell.radius);
            writer.writeFloat32(cell.score || 0);
        }

        // Visible players
        writer.writeUint16(visiblePlayers.length);
        for (const player of visiblePlayers) {
            writer.writeString(player.id);
            writer.writeString(player.name);
            writer.writeFloat32(player.x);
            writer.writeFloat32(player.y);
            writer.writeUint16(player.hue);
            writer.writeFloat32(player.massTotal);

            writer.writeUint16(player.cells.length);
            for (const cell of player.cells) {
                writer.writeFloat32(cell.x);
                writer.writeFloat32(cell.y);
                writer.writeFloat32(cell.mass);
                writer.writeFloat32(cell.radius);
                writer.writeFloat32(cell.score || 0);
            }
        }

        // Visible food
        writer.writeUint16(visibleFood.length);
        for (const food of visibleFood) {
            writer.writeFloat32(food.x);
            writer.writeFloat32(food.y);
            writer.writeUint16(food.hue);
            writer.writeFloat32(food.radius);
        }

        // Visible mass (ejected food)
        writer.writeUint16(visibleMass.length);
        for (const mass of visibleMass) {
            writer.writeFloat32(mass.x);
            writer.writeFloat32(mass.y);
            writer.writeUint16(mass.hue);
            writer.writeFloat32(mass.radius);
        }

        // Visible viruses
        writer.writeUint16(visibleViruses.length);
        for (const virus of visibleViruses) {
            writer.writeFloat32(virus.x);
            writer.writeFloat32(virus.y);
            writer.writeFloat32(virus.mass);
            writer.writeFloat32(virus.radius);
            writer.writeString(virus.fill || '#33ff33');
            writer.writeString(virus.stroke || '#19D119');
            writer.writeUint8(virus.strokeWidth || 2);
        }

        return writer.toBuffer();
    }

    /**
     * S2C_LEADERBOARD
     */
    static encodeLeaderboard(data) {
        const writer = new BinaryWriter(1024);
        writer.writeUint8(OPCODES.S2C_LEADERBOARD);

        writer.writeUint16(data.players); // total player count

        writer.writeUint16(data.leaderboard.length);
        for (const entry of data.leaderboard) {
            writer.writeString(entry.name);
            writer.writeFloat32(entry.massTotal || 0);
        }

        return writer.toBuffer();
    }

    /**
     * S2C_RIP - No data
     */
    static encodeRip() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.S2C_RIP);
        return writer.toBuffer();
    }

    /**
     * S2C_PLAYER_DIED
     */
    static encodePlayerDied(data) {
        const writer = new BinaryWriter(128);
        writer.writeUint8(OPCODES.S2C_PLAYER_DIED);
        writer.writeString(data.name);
        return writer.toBuffer();
    }

    /**
     * S2C_PLAYER_DISCONNECT
     */
    static encodePlayerDisconnect(data) {
        const writer = new BinaryWriter(128);
        writer.writeUint8(OPCODES.S2C_PLAYER_DISCONNECT);
        writer.writeString(data.name);
        return writer.toBuffer();
    }

    /**
     * S2C_PLAYER_JOIN
     */
    static encodePlayerJoin(data) {
        const writer = new BinaryWriter(128);
        writer.writeUint8(OPCODES.S2C_PLAYER_JOIN);
        writer.writeString(data.name);
        return writer.toBuffer();
    }

    /**
     * S2C_PLAYER_EATEN
     */
    static encodePlayerEaten(data) {
        const writer = new BinaryWriter(128);
        writer.writeUint8(OPCODES.S2C_PLAYER_EATEN);
        writer.writeString(data.eatenPlayerName);
        writer.writeFloat32(data.massGained);
        return writer.toBuffer();
    }

    /**
     * S2C_PONG - No data
     */
    static encodePong() {
        const writer = new BinaryWriter(1);
        writer.writeUint8(OPCODES.S2C_PONG);
        return writer.toBuffer();
    }

    /**
     * S2C_KICK
     */
    static encodeKick(reason) {
        const writer = new BinaryWriter(256);
        writer.writeUint8(OPCODES.S2C_KICK);
        writer.writeString(reason || '');
        return writer.toBuffer();
    }

    /**
     * S2C_SERVER_MSG
     */
    static encodeServerMsg(message) {
        const writer = new BinaryWriter(512);
        writer.writeUint8(OPCODES.S2C_SERVER_MSG);
        writer.writeString(message);
        return writer.toBuffer();
    }
}

/**
 * Decoder - Convert binary packets to message objects
 */
class Decoder {
    /**
     * Decode any packet - reads opcode and returns { opcode, data }
     */
    static decode(buffer) {
        const reader = new BinaryReader(buffer);
        const opcode = reader.readUint8();

        // Delegate to specific decoder based on opcode
        switch (opcode) {
            case OPCODES.C2S_RESPAWN:
                return { opcode, data: null };

            case OPCODES.C2S_GOTIT:
                return { opcode, data: Decoder.decodeGotit(reader) };

            case OPCODES.C2S_MOVEMENT:
                return { opcode, data: Decoder.decodeMovement(reader) };

            case OPCODES.C2S_EJECT:
                return { opcode, data: null };

            case OPCODES.C2S_SPLIT:
                return { opcode, data: null };

            case OPCODES.C2S_PING:
                return { opcode, data: null };

            case OPCODES.C2S_WINDOW_RESIZE:
                return { opcode, data: Decoder.decodeWindowResize(reader) };

            case OPCODES.C2S_ADMIN_LOGIN:
                return { opcode, data: Decoder.decodeAdminLogin(reader) };

            case OPCODES.C2S_ADMIN_KICK:
                return { opcode, data: Decoder.decodeAdminKick(reader) };

            case OPCODES.S2C_WELCOME:
                return { opcode, data: Decoder.decodeWelcome(reader) };

            case OPCODES.S2C_GAME_UPDATE:
                return { opcode, data: Decoder.decodeGameUpdate(reader) };

            case OPCODES.S2C_LEADERBOARD:
                return { opcode, data: Decoder.decodeLeaderboard(reader) };

            case OPCODES.S2C_RIP:
                return { opcode, data: null };

            case OPCODES.S2C_PLAYER_DIED:
                return { opcode, data: Decoder.decodePlayerDied(reader) };

            case OPCODES.S2C_PLAYER_DISCONNECT:
                return { opcode, data: Decoder.decodePlayerDisconnect(reader) };

            case OPCODES.S2C_PLAYER_JOIN:
                return { opcode, data: Decoder.decodePlayerJoin(reader) };

            case OPCODES.S2C_PLAYER_EATEN:
                return { opcode, data: Decoder.decodePlayerEaten(reader) };

            case OPCODES.S2C_PONG:
                return { opcode, data: null };

            case OPCODES.S2C_KICK:
                return { opcode, data: Decoder.decodeKick(reader) };

            case OPCODES.S2C_SERVER_MSG:
                return { opcode, data: Decoder.decodeServerMsg(reader) };

            default:
                throw new Error(`Unknown opcode: ${opcode}`);
        }
    }

    static decodeGotit(reader) {
        return {
            name: reader.readString(),
            hue: reader.readUint16(),
            screenWidth: reader.readUint16(),
            screenHeight: reader.readUint16()
        };
    }

    static decodeMovement(reader) {
        return {
            x: reader.readFloat32(),
            y: reader.readFloat32()
        };
    }

    static decodeWindowResize(reader) {
        return {
            screenWidth: reader.readUint16(),
            screenHeight: reader.readUint16()
        };
    }

    static decodeAdminLogin(reader) {
        return [reader.readString()]; // Return as array for compatibility
    }

    static decodeAdminKick(reader) {
        const name = reader.readString();
        const reason = reader.readString();
        const result = [name];
        if (reason) {
            result.push(...reason.split(' '));
        }
        return result;
    }

    static decodeWelcome(reader) {
        const playerSettings = {
            id: reader.readString(),
            name: reader.readString(),
            x: reader.readFloat32(),
            y: reader.readFloat32(),
            hue: reader.readUint16(),
            screenWidth: reader.readUint16(),
            screenHeight: reader.readUint16()
        };

        const gameSizes = {
            width: reader.readUint32(),
            height: reader.readUint32(),
            arenaId: reader.readString()
        };

        return { playerSettings, gameSizes };
    }

    static decodeGameUpdate(reader) {
        // Player data
        const playerData = {
            id: reader.readString(),
            name: reader.readString(),
            x: reader.readFloat32(),
            y: reader.readFloat32(),
            massTotal: reader.readFloat32(),
            hue: reader.readUint16(),
            cells: []
        };

        const cellCount = reader.readUint16();
        for (let i = 0; i < cellCount; i++) {
            playerData.cells.push({
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                mass: reader.readFloat32(),
                radius: reader.readFloat32(),
                score: reader.readFloat32()
            });
        }

        // Visible players
        const visiblePlayers = [];
        const playerCount = reader.readUint16();
        for (let i = 0; i < playerCount; i++) {
            const player = {
                id: reader.readString(),
                name: reader.readString(),
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                hue: reader.readUint16(),
                massTotal: reader.readFloat32(),
                cells: []
            };

            const pCellCount = reader.readUint16();
            for (let j = 0; j < pCellCount; j++) {
                player.cells.push({
                    x: reader.readFloat32(),
                    y: reader.readFloat32(),
                    mass: reader.readFloat32(),
                    radius: reader.readFloat32(),
                    score: reader.readFloat32()
                });
            }

            visiblePlayers.push(player);
        }

        // Visible food
        const visibleFood = [];
        const foodCount = reader.readUint16();
        for (let i = 0; i < foodCount; i++) {
            visibleFood.push({
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                hue: reader.readUint16(),
                radius: reader.readFloat32()
            });
        }

        // Visible mass
        const visibleMass = [];
        const massCount = reader.readUint16();
        for (let i = 0; i < massCount; i++) {
            visibleMass.push({
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                hue: reader.readUint16(),
                radius: reader.readFloat32()
            });
        }

        // Visible viruses
        const visibleViruses = [];
        const virusCount = reader.readUint16();
        for (let i = 0; i < virusCount; i++) {
            visibleViruses.push({
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                mass: reader.readFloat32(),
                radius: reader.readFloat32(),
                fill: reader.readString(),
                stroke: reader.readString(),
                strokeWidth: reader.readUint8()
            });
        }

        return {
            playerData,
            visiblePlayers,
            visibleFood,
            visibleMass,
            visibleViruses
        };
    }

    static decodeLeaderboard(reader) {
        const players = reader.readUint16();
        const leaderboard = [];

        const count = reader.readUint16();
        for (let i = 0; i < count; i++) {
            leaderboard.push({
                name: reader.readString(),
                massTotal: reader.readFloat32()
            });
        }

        return { players, leaderboard };
    }

    static decodePlayerDied(reader) {
        return { name: reader.readString() };
    }

    static decodePlayerDisconnect(reader) {
        return { name: reader.readString() };
    }

    static decodePlayerJoin(reader) {
        return { name: reader.readString() };
    }

    static decodePlayerEaten(reader) {
        return {
            eatenPlayerName: reader.readString(),
            massGained: reader.readFloat32()
        };
    }

    static decodeKick(reader) {
        return reader.readString();
    }

    static decodeServerMsg(reader) {
        return reader.readString();
    }
}

module.exports = {
    BinaryWriter,
    BinaryReader,
    Encoder,
    Decoder
};

