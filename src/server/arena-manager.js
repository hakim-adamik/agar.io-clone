/*jslint bitwise: true, node: true */
"use strict";

/**
 * Arena Manager
 *
 * Manages multiple game arenas, handles player assignment,
 * and performs cleanup of empty arenas.
 */

const Arena = require("./arena");

class ArenaManager {
    constructor(config, io) {
        this.arenas = new Map(); // arenaId → Arena instance
        this.config = config;
        this.io = io; // Store io instance to pass to arenas
        this.nextArenaId = 1;

        // Read from centralized config.js (always defined)
        this.maxPlayersPerArena = config.maxPlayersPerArena;
        this.arenaCleanupInterval = config.arenaCleanupTimeout;
        this.maxFreeArenas = config.maxFreeArenas || 5;
        this.maxPaidArenas = config.maxPaidArenas || 5;
        this.multiArenaEnabled = config.multiArenaEnabled;

        console.log("[ARENA MANAGER] Initialized with config:");
        console.log(`  - Max players per arena: ${this.maxPlayersPerArena}`);
        console.log(`  - Cleanup timeout: ${this.arenaCleanupInterval}ms`);
        console.log(`  - Max FREE arenas: ${this.maxFreeArenas}`);
        console.log(`  - Max PAID arenas: ${this.maxPaidArenas}`);
        console.log(`  - Multi-arena enabled: ${this.multiArenaEnabled}`);
    }

    /**
     * Determine if a socket represents a paid player
     * @param {Socket} socket - Socket to check
     * @returns {boolean} True if this is a paid (authenticated) player
     */
    isPaidPlayer(socket) {
        // Player must have BOTH userId and privyId to be considered paid
        return !!(socket.userId && socket.privyId);
    }

    /**
     * Find or create an arena with available slots
     * @param {string} preferredArenaId - Try to rejoin this arena if available
     * @param {Socket} socket - Socket to determine player type
     * @returns {Arena} Arena instance with available slots
     */
    findAvailableArena(preferredArenaId = null, socket = null) {
        // Check if client explicitly requested an arena type
        let requiredType = socket?.handshake?.query?.arenaType || null;

        // Determine if player is authenticated (paid)
        const isPaid = socket && this.isPaidPlayer(socket);

        // If FREE arena requested, allow it regardless of auth status
        // If PAID arena requested, require authentication
        if (requiredType === 'PAID' && !isPaid) {
            console.log('[ARENA MANAGER] PAID arena requested but player not authenticated, defaulting to FREE');
            requiredType = 'FREE';
        }

        // If no explicit type requested, determine based on authentication
        if (!requiredType) {
            requiredType = isPaid ? 'PAID' : 'FREE';
        }

        console.log(`[ARENA MANAGER] Player type check - userId: ${socket?.userId}, privyId: ${socket?.privyId}, isPaid: ${isPaid}, requiredType: ${requiredType}`);

        // 1. Try preferred arena first (for respawns) - but only if it matches type
        if (preferredArenaId && this.arenas.has(preferredArenaId)) {
            const arena = this.arenas.get(preferredArenaId);
            if (!arena.isFull() && arena.arenaType === requiredType) {
                console.log(
                    `[ARENA MANAGER] Assigning to preferred ${requiredType} arena ${preferredArenaId} (state: ${arena.state})`
                );
                return arena;
            }
            console.log(
                `[ARENA MANAGER] Preferred arena ${preferredArenaId} is full or wrong type (${arena.arenaType} vs ${requiredType})`
            );
        }

        // 2. Prioritize WAITING arenas that need more players (of matching type)
        for (const [id, arena] of this.arenas) {
            if (arena.state === 'WAITING' && !arena.isFull() && arena.arenaType === requiredType) {
                console.log(
                    `[ARENA MANAGER] Assigning to WAITING ${requiredType} arena ${id} (${arena.getWaitingPlayerCount()}/${arena.config.minPlayersToStart} players)`
                );
                return arena;
            }
        }

        // 3. Find any ACTIVE non-full arena (of matching type)
        for (const [id, arena] of this.arenas) {
            if (arena.state === 'ACTIVE' && !arena.isFull() && arena.arenaType === requiredType) {
                console.log(
                    `[ARENA MANAGER] Assigning to ACTIVE ${requiredType} arena ${id}`
                );
                return arena;
            }
        }

        // 4. Create new arena if all are full or no suitable arena found
        console.log(`[ARENA MANAGER] No suitable ${requiredType} arena found, creating new WAITING ${requiredType} arena`);
        return this.createArena(requiredType);
    }

    /**
     * Create a new arena
     * @param {string} arenaType - Type of arena to create ('PAID' or 'FREE')
     * @returns {Arena} New arena instance
     */
    createArena(arenaType = 'FREE') {
        // Count existing arenas by type
        let freeCount = 0;
        let paidCount = 0;
        for (const [id, arena] of this.arenas) {
            if (arena.arenaType === 'FREE') freeCount++;
            else if (arena.arenaType === 'PAID') paidCount++;
        }

        // Check type-specific limit
        const maxForType = arenaType === 'FREE' ? this.maxFreeArenas : this.maxPaidArenas;
        const currentCount = arenaType === 'FREE' ? freeCount : paidCount;

        if (currentCount >= maxForType) {
            console.error(
                `[ARENA MANAGER] Max ${arenaType} arenas reached (${currentCount}/${maxForType})`
            );
            // Return any available arena of the same type as fallback
            for (const [id, arena] of this.arenas) {
                if (arena.arenaType === arenaType && !arena.isFull()) {
                    console.log(`[ARENA MANAGER] Reusing existing ${arenaType} arena ${id}`);
                    return arena;
                }
            }
            // All arenas of this type are full, return first one anyway
            for (const [id, arena] of this.arenas) {
                if (arena.arenaType === arenaType) {
                    console.log(`[ARENA MANAGER] All ${arenaType} arenas full, returning ${id}`);
                    return arena;
                }
            }
            // This shouldn't happen but handle it
            console.error(`[ARENA MANAGER] No ${arenaType} arena found!`);
            return this.arenas.values().next().value;
        }

        const arenaId = `arena_${this.nextArenaId++}`;
        const arena = new Arena(arenaId, this.config, this.io, arenaType);

        // Don't start game loops yet - arena is in WAITING state
        // Game loops will start when minimum players join

        this.arenas.set(arenaId, arena);
        console.log(
            `[ARENA MANAGER] Created ${arenaType} ${arenaId} in WAITING state. Total arenas: ${this.arenas.size}`
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
                `[ARENA MANAGER] Cleaned up ${id}. Remaining arenas: ${this.arenas.size}`
            );
        });

        if (arenasToDelete.length > 0) {
            console.log(
                `[ARENA MANAGER] Cleanup complete. Active arenas: ${this.arenas.size}`
            );
        }
    }

    /**
     * Get arena by ID
     * @param {string} arenaId - Arena identifier
     * @returns {Arena|undefined} Arena instance or undefined
     */
    getArena(arenaId) {
        return this.arenas.get(arenaId);
    }

    /**
     * Get statistics for all arenas
     * @returns {object} Arena statistics
     */
    getStats() {
        const stats = {
            totalArenas: this.arenas.size,
            totalPlayers: 0,
            totalSpectators: 0,
            arenas: [],
        };

        for (const [id, arena] of this.arenas) {
            const playerCount = arena.getPlayerCount();
            const spectatorCount = arena.spectators.length;

            stats.totalPlayers += playerCount;
            stats.totalSpectators += spectatorCount;

            stats.arenas.push({
                id,
                playerCount,
                spectatorCount,
                createdAt: arena.createdAt,
                lastActivityAt: arena.lastActivityAt,
                isFull: arena.isFull(),
                isEmpty: arena.isEmpty(),
            });
        }

        return stats;
    }

    /**
     * Shutdown all arenas (graceful server shutdown)
     */
    shutdown() {
        console.log(
            `[ARENA MANAGER] Shutting down ${this.arenas.size} arenas...`
        );

        for (const [id, arena] of this.arenas) {
            arena.stop();
        }

        this.arenas.clear();
        console.log("[ARENA MANAGER] All arenas shut down");
    }
}

module.exports = ArenaManager;
