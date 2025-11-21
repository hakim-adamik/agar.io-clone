/*jslint node: true */
/*global describe, it, before, after, beforeEach, afterEach */

'use strict';

const assert = require('chai').assert;
const ArenaManager = require('../src/server/arena-manager');
const Arena = require('../src/server/arena');

// Mock config for testing
const mockConfig = {
    host: "0.0.0.0",
    port: 8080,
    gameWidth: 5000,
    gameHeight: 5000,
    minCellMass: 10,
    massUnit: 1,
    foodTarget: 1000,
    foodGenerationInterval: 2000,
    foodGenerationBatchMass: 3000,
    maxVirus: 50,
    slowBase: 4.5,
    networkUpdateFactor: 60,
    maxHeartbeatInterval: 5000,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "random",
    massLossRate: 1,
    minMassLoss: 50,
    fireFood: 20,
    limitSplit: 16,
    virus: {
        fill: "#33ff33",
        stroke: "#19D119",
        strokeWidth: 20,
        defaultMass: { from: 100, to: 150 },
        uniformDisposition: false,
    },
    sqlinfo: { fileName: "test.db" },

    // Multi-arena config
    multiArenaEnabled: true,
    maxPlayersPerArena: 10,
    arenaCleanupTimeout: 60000,
    maxTotalArenas: 50,
};

describe('Multi-Arena System', function() {

    describe('ArenaManager', function() {
        let arenaManager;
        let mockIo = {
            to: () => ({ emit: () => {} })  // Mock Socket.io
        };

        beforeEach(function() {
            arenaManager = new ArenaManager(mockConfig, mockIo);
        });

        afterEach(function() {
            // Clean up all arenas
            arenaManager.shutdown();
        });

        it('should initialize with correct configuration', function() {
            assert.equal(arenaManager.maxPlayersPerArena, 10);
            assert.equal(arenaManager.arenaCleanupInterval, 60000);
            assert.equal(arenaManager.maxTotalArenas, 50);
            assert.equal(arenaManager.multiArenaEnabled, true);
            assert.equal(arenaManager.arenas.size, 0);
        });

        it('should create a new arena', function() {
            const arena = arenaManager.createArena();

            assert.isNotNull(arena);
            assert.equal(arena.id, 'arena_1');
            assert.equal(arenaManager.arenas.size, 1);
            assert.equal(arena.getPlayerCount(), 0);
        });

        it('should create multiple arenas with sequential IDs', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();
            const arena3 = arenaManager.createArena();

            assert.equal(arena1.id, 'arena_1');
            assert.equal(arena2.id, 'arena_2');
            assert.equal(arena3.id, 'arena_3');
            assert.equal(arenaManager.arenas.size, 3);
        });

        it('should not exceed max total arenas', function() {
            // Set low limit for testing
            arenaManager.maxTotalArenas = 3;

            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();
            const arena3 = arenaManager.createArena();
            const arena4 = arenaManager.createArena(); // Should return existing arena

            assert.equal(arenaManager.arenas.size, 3);
            assert.equal(arena4.id, 'arena_1'); // Falls back to first arena
        });

        it('should find available arena when one exists', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Mock arena1 as having 5 players (not full)
            for (let i = 0; i < 5; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }

            const foundArena = arenaManager.findAvailableArena();

            assert.equal(foundArena.id, 'arena_1'); // Should return arena with space
            assert.isFalse(foundArena.isFull());
        });

        it('should create new arena when all are full', function() {
            const arena1 = arenaManager.createArena();

            // Fill arena1 with 10 players
            for (let i = 0; i < 10; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }

            const foundArena = arenaManager.findAvailableArena();

            assert.notEqual(foundArena.id, 'arena_1');
            assert.equal(foundArena.id, 'arena_2');
            assert.equal(arenaManager.arenas.size, 2);
        });

        it('should prefer specified arena if available', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Both arenas have space
            const foundArena = arenaManager.findAvailableArena('arena_2');

            assert.equal(foundArena.id, 'arena_2'); // Should return preferred arena
        });

        it('should fallback if preferred arena is full', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Fill arena2 (the preferred one)
            for (let i = 0; i < 10; i++) {
                arena2.map.players.data.push({ id: `player_${i}` });
            }

            const foundArena = arenaManager.findAvailableArena('arena_2');

            assert.equal(foundArena.id, 'arena_1'); // Should fallback to arena1
        });

        it('should cleanup empty arenas after timeout', function(done) {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Set last activity to 2 minutes ago
            arena1.lastActivityAt = Date.now() - 120000;

            // Arena should be cleaned up
            arenaManager.cleanupEmptyArenas();

            assert.equal(arenaManager.arenas.size, 1);
            assert.isUndefined(arenaManager.getArena('arena_1'));
            assert.isDefined(arenaManager.getArena('arena_2'));

            done();
        });

        it('should not cleanup arenas with players', function() {
            const arena1 = arenaManager.createArena();

            // Add a player
            arena1.map.players.data.push({ id: 'player_1' });

            // Set old activity time
            arena1.lastActivityAt = Date.now() - 120000;

            // Should NOT be cleaned up (has player)
            arenaManager.cleanupEmptyArenas();

            assert.equal(arenaManager.arenas.size, 1);
        });

        it('should return correct arena statistics', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Add players to arena1
            for (let i = 0; i < 7; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }

            // Add players to arena2
            for (let i = 0; i < 3; i++) {
                arena2.map.players.data.push({ id: `player_${i + 7}` });
            }

            const stats = arenaManager.getStats();

            assert.equal(stats.totalArenas, 2);
            assert.equal(stats.totalPlayers, 10);
            assert.equal(stats.arenas.length, 2);
            assert.equal(stats.arenas[0].playerCount, 7);
            assert.equal(stats.arenas[1].playerCount, 3);
        });
    });

    describe('Arena', function() {
        let arena;

        beforeEach(function() {
            arena = new Arena('test_arena', mockConfig);
        });

        afterEach(function() {
            arena.stop();
        });

        it('should initialize with correct properties', function() {
            assert.equal(arena.id, 'test_arena');
            assert.isNotNull(arena.map);
            assert.equal(arena.getPlayerCount(), 0);
            assert.isFalse(arena.isFull());
            assert.isTrue(arena.isEmpty());
        });

        it('should detect when arena is full', function() {
            // Add 10 players
            for (let i = 0; i < 10; i++) {
                arena.map.players.data.push({ id: `player_${i}` });
            }

            assert.equal(arena.getPlayerCount(), 10);
            assert.isTrue(arena.isFull());
            assert.isFalse(arena.isEmpty());
        });

        it('should detect when arena is not full', function() {
            // Add 5 players
            for (let i = 0; i < 5; i++) {
                arena.map.players.data.push({ id: `player_${i}` });
            }

            assert.equal(arena.getPlayerCount(), 5);
            assert.isFalse(arena.isFull());
            assert.isFalse(arena.isEmpty());
        });

        it('should detect when arena is empty', function() {
            assert.equal(arena.getPlayerCount(), 0);
            assert.equal(arena.spectators.length, 0);
            assert.isTrue(arena.isEmpty());
        });

        it('should not be empty with spectators only', function() {
            arena.spectators.push('spectator_1');

            assert.equal(arena.getPlayerCount(), 0);
            assert.equal(arena.spectators.length, 1);
            assert.isFalse(arena.isEmpty());
        });

        it('should start and stop game loops', function() {
            arena.start();

            assert.isNotNull(arena.tickInterval);
            assert.isNotNull(arena.gameloopInterval);
            assert.isNotNull(arena.updateInterval);

            arena.stop();

            // Intervals are cleared but references remain
            assert.isNotNull(arena.tickInterval);
        });

        it('should generate spawn points within boundaries', function() {
            const spawnpoint = arena.generateSpawnpoint();

            const radius = 4 + Math.sqrt(mockConfig.minCellMass) * 6; // massToRadius formula

            assert.isAtLeast(spawnpoint.x, radius);
            assert.isAtMost(spawnpoint.x, mockConfig.gameWidth - radius);
            assert.isAtLeast(spawnpoint.y, radius);
            assert.isAtMost(spawnpoint.y, mockConfig.gameHeight - radius);
        });
    });

    describe('Multi-Arena Integration', function() {
        let arenaManager;
        let mockIo = {
            to: () => ({ emit: () => {} })
        };

        beforeEach(function() {
            arenaManager = new ArenaManager(mockConfig, mockIo);
        });

        afterEach(function() {
            arenaManager.shutdown();
        });

        it('should distribute players across multiple arenas', function() {
            // Simulate 25 players joining
            const assignments = [];

            for (let i = 0; i < 25; i++) {
                const arena = arenaManager.findAvailableArena();
                assignments.push(arena.id);

                // Mock adding player
                arena.map.players.data.push({ id: `player_${i}` });
            }

            // Should have created 3 arenas (10 + 10 + 5)
            assert.equal(arenaManager.arenas.size, 3);

            const stats = arenaManager.getStats();
            assert.equal(stats.totalPlayers, 25);
            assert.equal(stats.arenas[0].playerCount, 10);
            assert.equal(stats.arenas[1].playerCount, 10);
            assert.equal(stats.arenas[2].playerCount, 5);
        });

        it('should handle respawn to same arena', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Add 5 players to arena1
            for (let i = 0; i < 5; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }

            // Player wants to rejoin arena_1
            const foundArena = arenaManager.findAvailableArena('arena_1');

            assert.equal(foundArena.id, 'arena_1'); // Should rejoin same arena
        });

        it('should redirect to different arena if preferred is full', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();

            // Fill arena1
            for (let i = 0; i < 10; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }

            // Player wants arena_1 but it's full
            const foundArena = arenaManager.findAvailableArena('arena_1');

            assert.equal(foundArena.id, 'arena_2'); // Should get arena2
        });

        it('should track last activity time', function() {
            const arena = arenaManager.createArena();
            const initialTime = arena.lastActivityAt;

            // Wait a moment
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            return delay(10).then(() => {
                arena.lastActivityAt = Date.now();
                assert.isAbove(arena.lastActivityAt, initialTime);
            });
        });

        it('should enforce max players per arena', function() {
            const arena = arenaManager.createArena();

            // Try to add 15 players
            for (let i = 0; i < 15; i++) {
                const targetArena = arenaManager.findAvailableArena();
                targetArena.map.players.data.push({ id: `player_${i}` });
            }

            // Should have created 2 arenas
            assert.equal(arenaManager.arenas.size, 2);

            // First arena should have 10 players
            const arena1 = arenaManager.getArena('arena_1');
            assert.equal(arena1.getPlayerCount(), 10);
            assert.isTrue(arena1.isFull());

            // Second arena should have 5 players
            const arena2 = arenaManager.getArena('arena_2');
            assert.equal(arena2.getPlayerCount(), 5);
            assert.isFalse(arena2.isFull());
        });

        it('should handle 100 players across 10 arenas', function() {
            // Simulate 100 players joining
            for (let i = 0; i < 100; i++) {
                const arena = arenaManager.findAvailableArena();
                arena.map.players.data.push({ id: `player_${i}` });
            }

            // Should have exactly 10 arenas
            assert.equal(arenaManager.arenas.size, 10);

            const stats = arenaManager.getStats();
            assert.equal(stats.totalPlayers, 100);

            // Each arena should have exactly 10 players
            stats.arenas.forEach(arenaInfo => {
                assert.equal(arenaInfo.playerCount, 10);
                assert.isTrue(arenaInfo.isFull);
            });
        });

        it('should cleanup multiple empty arenas', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();
            const arena3 = arenaManager.createArena();

            // Add player to arena2 only
            arena2.map.players.data.push({ id: 'player_1' });

            // Set old activity times for arena1 and arena3
            arena1.lastActivityAt = Date.now() - 120000;
            arena3.lastActivityAt = Date.now() - 120000;

            arenaManager.cleanupEmptyArenas();

            // Should only have arena2 left
            assert.equal(arenaManager.arenas.size, 1);
            assert.isDefined(arenaManager.getArena('arena_2'));
            assert.isUndefined(arenaManager.getArena('arena_1'));
            assert.isUndefined(arenaManager.getArena('arena_3'));
        });

        it('should provide accurate global statistics', function() {
            const arena1 = arenaManager.createArena();
            const arena2 = arenaManager.createArena();
            const arena3 = arenaManager.createArena();

            // Distribute players
            for (let i = 0; i < 7; i++) {
                arena1.map.players.data.push({ id: `player_${i}` });
            }
            for (let i = 7; i < 17; i++) {
                arena2.map.players.data.push({ id: `player_${i}` });
            }
            for (let i = 17; i < 20; i++) {
                arena3.map.players.data.push({ id: `player_${i}` });
            }

            // Add spectators
            arena1.spectators.push('spec_1', 'spec_2');
            arena3.spectators.push('spec_3');

            const stats = arenaManager.getStats();

            assert.equal(stats.totalArenas, 3);
            assert.equal(stats.totalPlayers, 20);
            assert.equal(stats.totalSpectators, 3);
            assert.equal(stats.arenas.length, 3);
        });

        it('should shutdown all arenas gracefully', function() {
            arenaManager.createArena();
            arenaManager.createArena();
            arenaManager.createArena();

            assert.equal(arenaManager.arenas.size, 3);

            arenaManager.shutdown();

            assert.equal(arenaManager.arenas.size, 0);
        });
    });

    describe('Arena Isolation', function() {
        let arena1, arena2;

        beforeEach(function() {
            arena1 = new Arena('arena_1', mockConfig);
            arena2 = new Arena('arena_2', mockConfig);
            arena1.start();
            arena2.start();
        });

        afterEach(function() {
            arena1.stop();
            arena2.stop();
        });

        it('should have independent player collections', function() {
            arena1.map.players.data.push({ id: 'player_1' });
            arena2.map.players.data.push({ id: 'player_2' });
            arena2.map.players.data.push({ id: 'player_3' });

            assert.equal(arena1.getPlayerCount(), 1);
            assert.equal(arena2.getPlayerCount(), 2);
        });

        it('should have independent leaderboards', function() {
            arena1.leaderboard = [{ name: 'Player1', score: 100 }];
            arena2.leaderboard = [{ name: 'Player2', score: 200 }];

            assert.notEqual(arena1.leaderboard, arena2.leaderboard);
            assert.equal(arena1.leaderboard.length, 1);
            assert.equal(arena2.leaderboard.length, 1);
        });

        it('should have independent food collections', function() {
            const initialFood1 = arena1.map.food.data.length;
            const initialFood2 = arena2.map.food.data.length;

            // Food collections should be independent
            assert.notEqual(arena1.map.food.data, arena2.map.food.data);
        });

        it('should have independent socket collections', function() {
            arena1.sockets['socket_1'] = { id: 'socket_1' };
            arena2.sockets['socket_2'] = { id: 'socket_2' };

            assert.equal(Object.keys(arena1.sockets).length, 1);
            assert.equal(Object.keys(arena2.sockets).length, 1);
            assert.isUndefined(arena1.sockets['socket_2']);
            assert.isUndefined(arena2.sockets['socket_1']);
        });
    });

    describe('Edge Cases', function() {
        let arenaManager;
        let mockIo = {
            to: () => ({ emit: () => {} })
        };

        beforeEach(function() {
            arenaManager = new ArenaManager(mockConfig, mockIo);
        });

        afterEach(function() {
            arenaManager.shutdown();
        });

        it('should handle requesting non-existent preferred arena', function() {
            const arena1 = arenaManager.createArena();

            // Request non-existent arena
            const foundArena = arenaManager.findAvailableArena('arena_999');

            // Should return the available arena1
            assert.equal(foundArena.id, 'arena_1');
        });

        it('should handle empty arenas map when finding available', function() {
            // No arenas exist yet
            assert.equal(arenaManager.arenas.size, 0);

            const arena = arenaManager.findAvailableArena();

            // Should create a new arena
            assert.equal(arena.id, 'arena_1');
            assert.equal(arenaManager.arenas.size, 1);
        });

        it('should handle concurrent arena creation', function() {
            // Simulate multiple players joining simultaneously
            const arenas = [];

            for (let i = 0; i < 5; i++) {
                arenas.push(arenaManager.findAvailableArena());
            }

            // Should only create one arena for first 5 players
            assert.equal(arenaManager.arenas.size, 1);
        });
    });
});

