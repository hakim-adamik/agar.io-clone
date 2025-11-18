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
const { SocketHandler, BroadcastHandler, OPCODES } = require("./socket-handler");

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

        // Wrap socket with binary protocol handler
        const socketHandler = new SocketHandler(socket);

        // Initialize heartbeat immediately to prevent premature disconnect
        currentPlayer.setLastHeartbeat();

        socketHandler.on(OPCODES.C2S_GOTIT, (clientPlayerData) => {
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
                socketHandler.disconnect();
                return;
            }

            if (!util.validNick(clientPlayerData.name)) {
                socketHandler.sendKick("Invalid username.");
                socketHandler.disconnect();
                return;
            }

            this.sockets[socket.id] = socketHandler;
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

        this.setupPlayerEvents(socketHandler, currentPlayer);
    }

    /**
     * Setup socket event handlers for a player
     */
    setupPlayerEvents(socketHandler, currentPlayer) {
        // Get underlying socket for disconnect handling
        const socket = socketHandler.getSocket();

        // Respawn handler - client sends this first to request spawn
        socketHandler.on(OPCODES.C2S_RESPAWN, () => {
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
            socketHandler.sendWelcome(currentPlayer, {
                width: this.config.gameWidth,
                height: this.config.gameHeight,
                arenaId: this.id,
            });

            console.log(
                `[ARENA ${this.id}] User ${currentPlayer.name} respawned with fresh state`
            );
            this.lastActivityAt = Date.now();
        });

        // Disconnect handler - use native socket.io event
        socket.on("disconnect", async () => {
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
        socketHandler.on(OPCODES.C2S_PING, () => {
            socketHandler.sendPong();
        });

        // Window resized
        socketHandler.on(OPCODES.C2S_WINDOW_RESIZE, (data) => {
            currentPlayer.screenWidth = data.screenWidth;
            currentPlayer.screenHeight = data.screenHeight;
        });

        // Movement handler
        socketHandler.on(OPCODES.C2S_MOVEMENT, (target) => {
            currentPlayer.lastHeartbeat = new Date().getTime();
            if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
                currentPlayer.target = target;
            }
            this.lastActivityAt = Date.now();
        });

        // Eject mass handler
        socketHandler.on(OPCODES.C2S_EJECT, () => {
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

        // Split handler
        socketHandler.on(OPCODES.C2S_SPLIT, () => {
            currentPlayer.userSplit(
                this.config.limitSplit,
                this.config.minSplitMass
            );
            this.lastActivityAt = Date.now();
        });

        // Admin commands
        this.setupAdminEvents(socketHandler, currentPlayer);
    }


    /**
     * Setup admin command handlers
     */
    setupAdminEvents(socketHandler, currentPlayer) {
        socketHandler.on(OPCODES.C2S_ADMIN_LOGIN, async (data) => {
            const password = data[0];
            if (password === this.config.adminPass) {
                console.log(
                    `[ARENA ${this.id}] ${currentPlayer.name} logged in as admin`
                );
                socketHandler.sendServerMsg("Welcome back " + currentPlayer.name);
                this.broadcastToArena(
                    "serverMSG",
                    currentPlayer.name + " just logged in as an admin."
                );
                currentPlayer.admin = true;
            } else {
                console.log(
                    `[ARENA ${this.id}] ${currentPlayer.name} failed admin login`
                );
                socketHandler.sendServerMsg("Password incorrect, attempt logged.");

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

        socketHandler.on(OPCODES.C2S_ADMIN_KICK, (data) => {
            if (!currentPlayer.admin) {
                socketHandler.sendServerMsg(
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
                    socketHandler.sendServerMsg(
                        `User ${player.name} was kicked by ${currentPlayer.name}`
                    );
                    this.sockets[player.id].sendKick(reason);
                    this.sockets[player.id].disconnect();
                    this.map.players.removePlayerByIndex(playerIndex);
                    worked = true;
                }
            }
            if (!worked) {
                socketHandler.sendServerMsg(
                    "Could not locate user or user is an admin."
                );
            }
        });
    }

    /**
     * Add spectator to this arena
     */
    addSpectator(socket) {
        const socketHandler = new SocketHandler(socket);

        socketHandler.on(OPCODES.C2S_GOTIT, () => {
            this.sockets[socket.id] = socketHandler;
            this.spectators.push(socket.id);
            this.broadcastToArena("playerJoin", { name: "" });
        });

        socketHandler.sendWelcome(
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
        // Use BroadcastHandler for binary messages
        const broadcaster = new BroadcastHandler(this.io, this.id);

        switch (event) {
            case "playerDied":
                broadcaster.broadcastPlayerDied(data);
                break;
            case "playerDisconnect":
                broadcaster.broadcastPlayerDisconnect(data);
                break;
            case "playerJoin":
                broadcaster.broadcastPlayerJoin(data);
                break;
            case "serverMSG":
                broadcaster.broadcastServerMsg(data);
                break;
            default:
                console.warn(`[ARENA ${this.id}] Unknown broadcast event: ${event}`);
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
            const socketHandler = this.sockets[currentPlayer.id];
            if (socketHandler) {
                socketHandler.sendKick(
                    "Last heartbeat received over " +
                        this.config.maxHeartbeatInterval +
                        " ago."
                );
                socketHandler.disconnect();
            }
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
                this.sockets[eatingPlayer.id].sendPlayerEaten({
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
                this.broadcastToArena("playerDied", {
                    name: playerGotEaten.name,
                });

                // Send RIP event to the dead player
                const deadPlayerHandler = this.sockets[playerGotEaten.id];
                if (deadPlayerHandler) {
                    deadPlayerHandler.sendRip();
                }

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
                const socketHandler = this.sockets[playerData.id];
                if (socketHandler) {
                    socketHandler.sendGameUpdate(
                        playerData,
                        visiblePlayers,
                        visibleFood,
                        visibleMass,
                        visibleViruses
                    );

                    if (this.leaderboardChanged) {
                        this.sendLeaderboard(socketHandler);
                    }
                }
            }
        );

        this.leaderboardChanged = false;
    }

    /**
     * Send leaderboard to a specific socket handler
     */
    sendLeaderboard(socketHandler) {
        socketHandler.sendLeaderboard({
            players: this.map.players.data.length,
            leaderboard: this.leaderboard,
        });
    }

    /**
     * Update spectator view
     */
    updateSpectator(socketID) {
        const socketHandler = this.sockets[socketID];
        if (!socketHandler) return;

        let playerData = {
            x: this.config.gameWidth / 2,
            y: this.config.gameHeight / 2,
            cells: [],
            massTotal: 0,
            hue: 100,
            id: socketID,
            name: "",
        };
        socketHandler.sendGameUpdate(
            playerData,
            this.map.players.data,
            this.map.food.data,
            this.map.massFood.data,
            this.map.viruses.data
        );
        if (this.leaderboardChanged) {
            this.sendLeaderboard(socketHandler);
        }
    }
}

module.exports = Arena;
