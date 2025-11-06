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
    constructor(config) {
        this.arenas = new Map(); // arenaId → Arena instance
        this.config = config;
        this.nextArenaId = 1;

        // Read from centralized config.js (always defined)
        this.maxPlayersPerArena = config.maxPlayersPerArena;
        this.arenaCleanupInterval = config.arenaCleanupTimeout;
        this.maxTotalArenas = config.maxTotalArenas;
        this.multiArenaEnabled = config.multiArenaEnabled;

        console.log("[ARENA MANAGER] Initialized with config:");
        console.log(`  - Max players per arena: ${this.maxPlayersPerArena}`);
        console.log(`  - Cleanup timeout: ${this.arenaCleanupInterval}ms`);
        console.log(`  - Max total arenas: ${this.maxTotalArenas}`);
        console.log(`  - Multi-arena enabled: ${this.multiArenaEnabled}`);
    }

    /**
     * Find or create an arena with available slots
     * @param {string} preferredArenaId - Try to rejoin this arena if available
     * @returns {Arena} Arena instance with available slots
     */
    findAvailableArena(preferredArenaId = null) {
        // 1. Try preferred arena first (for respawns)
        if (preferredArenaId && this.arenas.has(preferredArenaId)) {
            const arena = this.arenas.get(preferredArenaId);
            if (!arena.isFull()) {
                console.log(
                    `[ARENA MANAGER] Assigning to preferred arena ${preferredArenaId}`
                );
                return arena;
            }
            console.log(
                `[ARENA MANAGER] Preferred arena ${preferredArenaId} is full`
            );
        }

        // 2. Find any non-full arena
        for (const [id, arena] of this.arenas) {
            if (!arena.isFull()) {
                console.log(
                    `[ARENA MANAGER] Assigning to available arena ${id}`
                );
                return arena;
            }
        }

        // 3. Create new arena if all are full
        console.log("[ARENA MANAGER] All arenas full, creating new arena");
        return this.createArena();
    }

    /**
     * Create a new arena
     * @returns {Arena} New arena instance
     */
    createArena() {
        // Check max arena limit
        if (this.arenas.size >= this.maxTotalArenas) {
            console.error(
                `[ARENA MANAGER] Max arenas reached (${this.maxTotalArenas})`
            );
            // Return any available arena as fallback
            return this.arenas.values().next().value;
        }

        const arenaId = `arena_${this.nextArenaId++}`;
        const arena = new Arena(arenaId, this.config);

        // Start arena game loops
        arena.start();

        this.arenas.set(arenaId, arena);
        console.log(
            `[ARENA MANAGER] Created ${arenaId}. Total arenas: ${this.arenas.size}`
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
