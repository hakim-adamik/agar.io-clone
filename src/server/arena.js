/*jslint bitwise: true, node: true */
"use strict";

/**
 * Arena Class
 *
 * Represents an isolated game instance with its own map, players,
 * game loops, and leaderboard. Each arena can host up to maxPlayersPerArena.
 */

const SAT = require("sat");
const util = require("./lib/util");
const mapUtils = require("./map/map");
const { getPosition } = require("./lib/entityUtils");
const loggingRepository = require("./repositories/logging-repository");
const AuthService = require("./services/auth-service");
const SessionRepository = require("./repositories/session-repository");

const Vector = SAT.Vector;

class Arena {
    constructor(arenaId, config, io) {
        this.id = arenaId;
        this.config = config;
        this.io = io;  // Store io instance for room broadcasting
        this.createdAt = Date.now();
        this.lastActivityAt = Date.now();

        // Game state (isolated per arena)
        this.map = new mapUtils.Map(config);
        this.sockets = {}; // Players in THIS arena
        this.spectators = []; // Spectators in THIS arena
        this.leaderboard = []; // Leaderboard for THIS arena
        this.leaderboardChanged = false;
        this.escapeTimers = {}; // Track active escape countdowns {playerId: {timer, countdown}}

        // Game loop intervals (each arena has its own)
        this.tickInterval = null;
        this.gameloopInterval = null;
        this.updateInterval = null;

        // Constants
        this.INIT_MASS_LOG = util.mathLog(
            config.minSplitMass,
            config.slowBase
        );
    }

    /**
     * Get current player count
     */
    getPlayerCount() {
        return this.map.players.data.length;
    }

    /**
     * Check if arena is at capacity
     */
    isFull() {
        return this.getPlayerCount() >= this.config.maxPlayersPerArena;
    }

    /**
     * Check if arena is empty
     */
    isEmpty() {
        return this.getPlayerCount() === 0 && this.spectators.length === 0;
    }

    /**
     * Start arena game loops
     */
    start() {
        // Game tick (physics, collisions) - 60 FPS
        this.tickInterval = setInterval(() => {
            this.tickGame();
        }, 1000 / 60);

        // Game loop (balance, leaderboard) - 1 FPS
        this.gameloopInterval = setInterval(() => {
            this.gameloop();
        }, 1000);

        // Send updates to clients - configurable Hz
        this.updateInterval = setInterval(() => {
            this.sendUpdates();
        }, 1000 / this.config.networkUpdateFactor);

        console.log(`[ARENA ${this.id}] Started game loops`);
    }

    /**
     * Stop arena game loops (cleanup)
     */
    stop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        if (this.gameloopInterval) clearInterval(this.gameloopInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);

        console.log(`[ARENA ${this.id}] Stopped game loops`);
    }

    /**
     * Add player to this arena
     */
    addPlayer(socket) {
        const currentPlayer = new mapUtils.playerUtils.Player(socket.id, this.config);

        // Initialize heartbeat immediately to prevent premature disconnect
        currentPlayer.setLastHeartbeat();

        socket.on("gotit", (clientPlayerData) => {
            console.log(
                `[ARENA ${this.id}] Player ${clientPlayerData.name} connecting!`
            );
            currentPlayer.init(
                this.generateSpawnpoint(),
                this.config.defaultPlayerMass
            );

            // Reset heartbeat after init
            currentPlayer.setLastHeartbeat();

            if (this.map.players.findIndexByID(socket.id) > -1) {
                console.log(
                    `[ARENA ${this.id}] Player ID already connected, kicking.`
                );
                socket.disconnect();
                return;
            }

            if (!util.validNick(clientPlayerData.name)) {
                socket.emit("kick", "Invalid username.");
                socket.disconnect();
                return;
            }

            this.sockets[socket.id] = socket;
            const sanitizedName = clientPlayerData.name.replace(
                /(<([^>]+)>)/gi,
                ""
            );
            clientPlayerData.name = sanitizedName;

            currentPlayer.clientProvidedData(clientPlayerData);
            this.map.players.pushNew(currentPlayer);

            // Broadcast only to THIS arena
            this.broadcastToArena("playerJoin", { name: currentPlayer.name });

            console.log(
                `[ARENA ${this.id}] Total players: ${this.map.players.data.length}`
            );
            this.lastActivityAt = Date.now();
        });

        this.setupPlayerEvents(socket, currentPlayer);
    }

    /**
     * Setup socket event handlers for a player
     */
    setupPlayerEvents(socket, currentPlayer) {
        // Respawn handler - client sends this first to request spawn
        socket.on("respawn", () => {
            // Remove any existing player data
            this.map.players.removePlayerByID(currentPlayer.id);

            // IMPORTANT: Reinitialize the player with fresh state
            // This ensures they get new cells and can move
            currentPlayer.init(
                this.generateSpawnpoint(),
                this.config.defaultPlayerMass
            );

            // Reset player stats for fresh spawn
            currentPlayer.cells = [];
            currentPlayer.massTotal = 0;

            // Send welcome with the reinitialized player
            socket.emit("welcome", currentPlayer, {
                width: this.config.gameWidth,
                height: this.config.gameHeight,
                arenaId: this.id,
            });

            console.log(
                `[ARENA ${this.id}] User ${currentPlayer.name} respawned with fresh state`
            );
            this.lastActivityAt = Date.now();
        });

        // Disconnect handler
        socket.on("disconnect", async () => {
            // Clear any active escape timer
            this.clearEscapeTimer(currentPlayer.id);

            // TODO: Re-enable session tracking once disconnect issue is fixed
            /*
            // End game session if authenticated user
            if (socket.sessionId && socket.userId) {
                try {
                    const finalStats = {
                        userId: socket.userId,
                        final_score: currentPlayer.massTotal || 0,
                        final_mass: currentPlayer.massTotal || 0,
                        mass_eaten: currentPlayer.massEaten || 0,
                        players_eaten: currentPlayer.playersEaten || 0
                    };
                    await AuthService.endGameSession(socket.sessionId, finalStats);
                    console.log(`[ARENA ${this.id}] Ended session ${socket.sessionId} for user ${socket.userId}`);
                } catch (error) {
                    console.error('[ARENA] Failed to end game session:', error);
                }
            }
            */

            this.map.players.removePlayerByID(currentPlayer.id);
            delete this.sockets[socket.id];
            console.log(
                `[ARENA ${this.id}] User ${currentPlayer.name} disconnected`
            );
            this.broadcastToArena("playerDisconnect", {
                name: currentPlayer.name,
            });
            this.lastActivityAt = Date.now();
        });

        // Ping check
        socket.on("pingcheck", () => {
            socket.emit("pongcheck");
        });

        // Window resized
        socket.on("windowResized", (data) => {
            currentPlayer.screenWidth = data.screenWidth;
            currentPlayer.screenHeight = data.screenHeight;
        });

        // Movement handler (0)
        socket.on("0", (target) => {
            currentPlayer.lastHeartbeat = new Date().getTime();
            if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
                currentPlayer.target = target;
            }
            this.lastActivityAt = Date.now();
        });

        // Eject mass handler (1)
        socket.on("1", () => {
            const minCellMass =
                this.config.defaultPlayerMass + this.config.fireFood;
            for (let i = 0; i < currentPlayer.cells.length; i++) {
                if (currentPlayer.cells[i].mass >= minCellMass) {
                    currentPlayer.changeCellMass(i, -this.config.fireFood);
                    this.map.massFood.addNew(
                        currentPlayer,
                        i,
                        this.config.fireFood
                    );
                }
            }
            this.lastActivityAt = Date.now();
        });

        // Split handler (2)
        socket.on("2", () => {
            currentPlayer.userSplit(
                this.config.limitSplit,
                this.config.minSplitMass
            );
            this.lastActivityAt = Date.now();
        });

        // Escape request handler
        socket.on("escapeRequest", () => {
            this.handleEscapeRequest(socket, currentPlayer);
        });

        // Admin commands
        this.setupAdminEvents(socket, currentPlayer);
    }


    /**
     * Setup admin command handlers
     */
    setupAdminEvents(socket, currentPlayer) {
        socket.on("pass", async (data) => {
            const password = data[0];
            if (password === this.config.adminPass) {
                console.log(
                    `[ARENA ${this.id}] ${currentPlayer.name} logged in as admin`
                );
                socket.emit("serverMSG", "Welcome back " + currentPlayer.name);
                this.broadcastToArena(
                    "serverMSG",
                    currentPlayer.name + " just logged in as an admin."
                );
                currentPlayer.admin = true;
            } else {
                console.log(
                    `[ARENA ${this.id}] ${currentPlayer.name} failed admin login`
                );
                socket.emit("serverMSG", "Password incorrect, attempt logged.");

                loggingRepository
                    .logFailedLoginAttempt(
                        currentPlayer.name,
                        currentPlayer.ipAddress
                    )
                    .catch((err) =>
                        console.error("Error logging failed login", err)
                    );
            }
        });

        socket.on("kick", (data) => {
            if (!currentPlayer.admin) {
                socket.emit(
                    "serverMSG",
                    "You are not permitted to use this command."
                );
                return;
            }

            var reason = "";
            var worked = false;
            for (let playerIndex in this.map.players.data) {
                let player = this.map.players.data[playerIndex];
                if (player.name === data[0] && !player.admin && !worked) {
                    if (data.length > 1) {
                        for (var f = 1; f < data.length; f++) {
                            reason +=
                                f === data.length ? data[f] : data[f] + " ";
                        }
                    }
                    console.log(
                        `[ARENA ${this.id}] ${player.name} kicked by ${
                            currentPlayer.name
                        }${reason ? " for " + reason : ""}`
                    );
                    socket.emit(
                        "serverMSG",
                        `User ${player.name} was kicked by ${currentPlayer.name}`
                    );
                    this.sockets[player.id].emit("kick", reason);
                    this.sockets[player.id].disconnect();
                    this.map.players.removePlayerByIndex(playerIndex);
                    worked = true;
                }
            }
            if (!worked) {
                socket.emit(
                    "serverMSG",
                    "Could not locate user or user is an admin."
                );
            }
        });
    }

    /**
     * Add spectator to this arena
     */
    addSpectator(socket) {
        socket.on("gotit", () => {
            this.sockets[socket.id] = socket;
            this.spectators.push(socket.id);
            this.broadcastToArena("playerJoin", { name: "" });
        });

        socket.emit(
            "welcome",
            {},
            {
                width: this.config.gameWidth,
                height: this.config.gameHeight,
                arenaId: this.id,
            }
        );

        console.log(`[ARENA ${this.id}] Spectator joined`);
    }

    /**
     * Handle escape request from a player
     * Starts a server-side countdown before allowing the player to exit
     */
    handleEscapeRequest(socket, player) {
        // Check if player already has an active escape timer
        if (this.escapeTimers[player.id]) {
            // Already escaping, ignore duplicate requests
            return;
        }

        // Check if player is already dead/removed
        const playerIndex = this.map.players.findIndexByID(player.id);
        if (playerIndex < 0) {
            return;
        }

        console.log(`[ARENA ${this.id}] Player ${player.name} requested escape`);

        // Start countdown from 4 seconds
        let countdown = 4;

        // Notify client that escape has started
        socket.emit("escapeStarted", { countdown });

        // Create countdown timer
        const timer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                // Send countdown update to client
                socket.emit("escapeUpdate", { countdown });
            } else {
                // Countdown complete, disconnect player
                this.clearEscapeTimer(player.id);

                // Notify client that escape is complete
                socket.emit("escapeComplete");

                console.log(`[ARENA ${this.id}] Player ${player.name} escaped successfully`);

                // Give client a moment to receive the message before disconnecting
                setTimeout(() => {
                    if (socket.connected) {
                        socket.disconnect();
                    }
                }, 100);
            }
        }, 1000);

        // Store timer reference
        this.escapeTimers[player.id] = {
            timer,
            countdown,
            socket
        };
    }

    /**
     * Clear an escape timer for a player
     * Used when player disconnects or dies during escape
     */
    clearEscapeTimer(playerId) {
        if (this.escapeTimers[playerId]) {
            clearInterval(this.escapeTimers[playerId].timer);
            delete this.escapeTimers[playerId];
        }
    }

    /**
     * Cancel an escape attempt (e.g., if player dies during countdown)
     */
    cancelEscape(playerId) {
        if (this.escapeTimers[playerId]) {
            const escapeData = this.escapeTimers[playerId];
            this.clearEscapeTimer(playerId);

            // Notify client that escape was cancelled
            if (escapeData.socket && escapeData.socket.connected) {
                escapeData.socket.emit("escapeCancelled");
            }
        }
    }

    /**
     * Generate spawn point for this arena
     */
    generateSpawnpoint() {
        const radius = util.massToRadius(this.config.defaultPlayerMass);
        return getPosition(
            this.config.newPlayerInitialPosition === "farthest",
            radius,
            this.map.players.data
        );
    }

    /**
     * Broadcast event to all players in THIS arena only
     */
    broadcastToArena(event, data) {
        // Use Socket.io room broadcasting (more reliable)
        if (this.io) {
            this.io.to(this.id).emit(event, data);
        } else {
            // Fallback to individual socket emission
            for (const socketId in this.sockets) {
                this.sockets[socketId].emit(event, data);
            }
        }
    }

    /**
     * Tick a single player (physics, eating, collisions)
     */
    tickPlayer(currentPlayer) {
        // Check heartbeat
        if (
            currentPlayer.lastHeartbeat <
            new Date().getTime() - this.config.maxHeartbeatInterval
        ) {
            this.sockets[currentPlayer.id].emit(
                "kick",
                "Last heartbeat received over " +
                    this.config.maxHeartbeatInterval +
                    " ago."
            );
            this.sockets[currentPlayer.id].disconnect();
            return;
        }

        // Move player
        currentPlayer.move(
            this.config.slowBase,
            this.config.gameWidth,
            this.config.gameHeight,
            this.INIT_MASS_LOG
        );

        const isEntityInsideCircle = (point, circle) => {
            return SAT.pointInCircle(new Vector(point.x, point.y), circle);
        };

        const canEatMass = (cell, cellCircle, cellIndex, mass) => {
            if (isEntityInsideCircle(mass, cellCircle)) {
                if (
                    mass.id === currentPlayer.id &&
                    mass.speed > 0 &&
                    cellIndex === mass.num
                )
                    return false;
                if (cell.mass > mass.mass * 1.1) return true;
            }
            return false;
        };

        const canEatVirus = (cell, cellCircle, virus) => {
            return (
                virus.mass < cell.mass &&
                isEntityInsideCircle(virus, cellCircle)
            );
        };

        const cellsToSplit = [];
        for (
            let cellIndex = 0;
            cellIndex < currentPlayer.cells.length;
            cellIndex++
        ) {
            const currentCell = currentPlayer.cells[cellIndex];
            const cellCircle = currentCell.toCircle();

            const eatenFoodIndexes = util.getIndexes(
                this.map.food.data,
                (food) => isEntityInsideCircle(food, cellCircle)
            );
            const eatenMassIndexes = util.getIndexes(
                this.map.massFood.data,
                (mass) => canEatMass(currentCell, cellCircle, cellIndex, mass)
            );
            const eatenVirusIndexes = util.getIndexes(
                this.map.viruses.data,
                (virus) => canEatVirus(currentCell, cellCircle, virus)
            );

            if (eatenVirusIndexes.length > 0) {
                cellsToSplit.push(cellIndex);
                this.map.viruses.delete(eatenVirusIndexes);
            }

            let massGained = eatenMassIndexes.reduce(
                (acc, index) => acc + this.map.massFood.data[index].mass,
                0
            );

            this.map.food.delete(eatenFoodIndexes);
            this.map.massFood.remove(eatenMassIndexes);
            massGained += eatenFoodIndexes.length * this.config.foodMass;
            currentPlayer.changeCellMass(cellIndex, massGained);
        }
        currentPlayer.virusSplit(
            cellsToSplit,
            this.config.limitSplit,
            this.config.minSplitMass
        );
    }

    /**
     * Game tick - physics and collisions for THIS arena
     */
    tickGame() {
        this.map.players.data.forEach((player) => this.tickPlayer(player));
        this.map.massFood.move(this.config.gameWidth, this.config.gameHeight);

        this.map.players.handleCollisions((gotEaten, eater) => {
            const cellGotEaten = this.map.players.getCell(
                gotEaten.playerIndex,
                gotEaten.cellIndex
            );
            this.map.players.data[eater.playerIndex].changeCellMass(
                eater.cellIndex,
                cellGotEaten.mass
            );

            // Notify the eating player about successful kill
            const eatingPlayer = this.map.players.data[eater.playerIndex];
            const eatenPlayer = this.map.players.data[gotEaten.playerIndex];

            if (eatingPlayer && eatenPlayer && this.sockets[eatingPlayer.id]) {
                this.sockets[eatingPlayer.id].emit("playerEaten", {
                    eatenPlayerName: eatenPlayer.name,
                    massGained: cellGotEaten.mass
                });
            }

            const playerDied = this.map.players.removeCell(
                gotEaten.playerIndex,
                gotEaten.cellIndex
            );
            if (playerDied) {
                let playerGotEaten =
                    this.map.players.data[gotEaten.playerIndex];

                // Cancel any active escape attempt
                this.cancelEscape(playerGotEaten.id);

                this.broadcastToArena("playerDied", {
                    name: playerGotEaten.name,
                });

                // Send RIP event to the dead player
                this.sockets[playerGotEaten.id].emit("RIP");

                // Remove player from map
                this.map.players.removePlayerByIndex(gotEaten.playerIndex);

                // IMPORTANT: Clean up socket connection to force fresh respawn
                // Remove from sockets dictionary
                delete this.sockets[playerGotEaten.id];

                // Force disconnect to ensure clean reconnection
                // The socket will be disconnected by the client, but we remove our reference
                console.log(`[ARENA ${this.id}] Player ${playerGotEaten.name} died and removed from arena`);
            }
        });
    }

    /**
     * Game loop - balancing and leaderboard for THIS arena
     */
    gameloop() {
        if (this.map.players.data.length > 0) {
            this.calculateLeaderboard();
            this.map.players.shrinkCells(
                this.config.massLossRate,
                this.config.defaultPlayerMass,
                this.config.minMassLoss
            );
        }

        this.map.balanceMass(
            this.config.foodMass,
            this.config.gameMass,
            this.config.maxFood,
            this.config.maxVirus
        );
    }

    /**
     * Calculate leaderboard for this arena
     */
    calculateLeaderboard() {
        const topPlayers = this.map.players.getTopPlayers();

        if (this.leaderboard.length !== topPlayers.length) {
            this.leaderboard = topPlayers;
            this.leaderboardChanged = true;
        } else {
            for (let i = 0; i < this.leaderboard.length; i++) {
                if (this.leaderboard[i].id !== topPlayers[i].id) {
                    this.leaderboard = topPlayers;
                    this.leaderboardChanged = true;
                    break;
                }
            }
        }
    }

    /**
     * Send updates to players in THIS arena
     */
    sendUpdates() {
        // Update spectators
        this.spectators.forEach((socketId) => this.updateSpectator(socketId));

        // Update players
        this.map.enumerateWhatPlayersSee(
            (
                playerData,
                visiblePlayers,
                visibleFood,
                visibleMass,
                visibleViruses
            ) => {
                this.sockets[playerData.id].emit(
                    "serverTellPlayerMove",
                    playerData,
                    visiblePlayers,
                    visibleFood,
                    visibleMass,
                    visibleViruses
                );

                if (this.leaderboardChanged) {
                    this.sendLeaderboard(this.sockets[playerData.id]);
                }
            }
        );

        this.leaderboardChanged = false;
    }

    /**
     * Send leaderboard to a specific socket
     */
    sendLeaderboard(socket) {
        socket.emit("leaderboard", {
            players: this.map.players.data.length,
            leaderboard: this.leaderboard,
        });
    }

    /**
     * Update spectator view
     */
    updateSpectator(socketID) {
        let playerData = {
            x: this.config.gameWidth / 2,
            y: this.config.gameHeight / 2,
            cells: [],
            massTotal: 0,
            hue: 100,
            id: socketID,
            name: "",
        };
        this.sockets[socketID].emit(
            "serverTellPlayerMove",
            playerData,
            this.map.players.data,
            this.map.food.data,
            this.map.massFood.data,
            this.map.viruses.data
        );
        if (this.leaderboardChanged) {
            this.sendLeaderboard(this.sockets[socketID]);
        }
    }
}

module.exports = Arena;
