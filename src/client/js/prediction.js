/**
 * Client-side prediction system for smooth gameplay
 * Handles velocity calculation and position extrapolation
 */

const config = require('../../../config.js');

class PredictionSystem {
    constructor() {
        // State for current player
        this.playerState = {
            previous: { x: 0, y: 0, cells: [], timestamp: 0 },
            current: { x: 0, y: 0, cells: [], timestamp: 0 },
            predicted: { x: 0, y: 0, cells: [] },
            velocity: { x: 0, y: 0 },
            cellVelocities: []
        };

        // State for other players
        this.otherPlayers = {
            states: {},  // Map of playerId -> state
            timestamp: 0
        };

        // Merge transition state for smooth camera during cell merges
        this.mergeTransition = {
            active: false,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0,
            progress: 0,
            duration: 500 // milliseconds for transition (increased for smoother feel)
        };

        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateTimes = [];
    }

    /**
     * Enable or disable prediction system
     */
    setEnabled(enabled) {
        config.predictionEnabled = enabled;
        if (!enabled) {
            this.reset();
        }
    }

    /**
     * Update configuration values
     */
    updateConfig(configUpdates) {
        Object.keys(configUpdates).forEach(key => {
            const configKey = 'prediction' + key.charAt(0).toUpperCase() + key.slice(1);
            if (config.hasOwnProperty(configKey)) {
                config[configKey] = configUpdates[key];
            }
        });
    }

    /**
     * Process new server state for current player
     */
    updatePlayerState(playerData, timestamp) {
        if (!config.predictionEnabled) {
            // Prediction disabled - update state but don't extrapolate
            this.playerState.current = {
                x: playerData.x,
                y: playerData.y,
                cells: this.cloneCells(playerData.cells),
                timestamp: timestamp
            };
            this.playerState.predicted = {
                x: playerData.x,
                y: playerData.y,
                cells: this.cloneCells(playerData.cells)
            };
            return this.playerState.predicted;
        }

        // Track update timing
        if (this.lastUpdateTime > 0) {
            const timeSinceLastUpdate = timestamp - this.lastUpdateTime;
            this.updateTimes.push(timeSinceLastUpdate);
            if (this.updateTimes.length > 30) {
                this.updateTimes.shift();
            }
        }
        this.lastUpdateTime = timestamp;

        // First update - initialize
        if (!this.playerState.previous.timestamp) {
            this.playerState.previous = {
                x: playerData.x,
                y: playerData.y,
                cells: this.cloneCells(playerData.cells),
                timestamp: timestamp
            };
            this.playerState.current = {
                x: playerData.x,
                y: playerData.y,
                cells: this.cloneCells(playerData.cells),
                timestamp: timestamp
            };
            this.playerState.predicted = {
                x: playerData.x,
                y: playerData.y,
                cells: this.cloneCells(playerData.cells)
            };

            return this.playerState.predicted;
        }

        // Shift states and calculate velocity
        this.playerState.previous = this.playerState.current;
        this.playerState.current = {
            x: playerData.x,
            y: playerData.y,
            cells: this.cloneCells(playerData.cells),
            timestamp: timestamp
        };

        // Calculate velocities
        this.calculatePlayerVelocity();

        // Start prediction from current server state
        this.playerState.predicted = {
            x: this.playerState.current.x,
            y: this.playerState.current.y,
            cells: this.cloneCells(this.playerState.current.cells)
        };

        return this.playerState.predicted;
    }

    /**
     * Calculate velocity for player camera and cells
     */
    calculatePlayerVelocity() {
        const timeDelta = this.playerState.current.timestamp - this.playerState.previous.timestamp;

        // Only calculate velocity if updates are far enough apart
        if (timeDelta <= config.predictionMinTimeDelta) {
            return;
        }

        // Calculate camera velocity
        let vx = (this.playerState.current.x - this.playerState.previous.x) / timeDelta;
        let vy = (this.playerState.current.y - this.playerState.previous.y) / timeDelta;

        // Cap velocity to prevent glitches
        const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
        if (velocityMagnitude > config.predictionMaxVelocity) {
            const scale = config.predictionMaxVelocity / velocityMagnitude;
            vx *= scale;
            vy *= scale;
        }

        this.playerState.velocity.x = vx;
        this.playerState.velocity.y = vy;

        // Calculate velocity for each cell
        if (this.playerState.current.cells.length === this.playerState.previous.cells.length) {
            this.playerState.cellVelocities = [];
            for (let i = 0; i < this.playerState.current.cells.length; i++) {
                const currCell = this.playerState.current.cells[i];
                const prevCell = this.playerState.previous.cells[i];
                let cellVx = (currCell.x - prevCell.x) / timeDelta;
                let cellVy = (currCell.y - prevCell.y) / timeDelta;

                // Cap cell velocity
                const cellVelMagnitude = Math.sqrt(cellVx * cellVx + cellVy * cellVy);
                if (cellVelMagnitude > config.predictionMaxVelocity) {
                    const cellScale = config.predictionMaxVelocity / cellVelMagnitude;
                    cellVx *= cellScale;
                    cellVy *= cellScale;
                }

                this.playerState.cellVelocities.push({ vx: cellVx, vy: cellVy });
            }
        } else {
            // Cell count changed (split/merge) - reset velocities
            this.playerState.cellVelocities = [];

            // Detect and log merge/split events
            const previousCount = this.playerState.previous.cells.length;
            const currentCount = this.playerState.current.cells.length;

            if (currentCount < previousCount) {
                console.log(`🔄 Cells merged! ${previousCount} → ${currentCount}`);

                // If a transition is already active, start from current animated position
                // This prevents jumps when multiple merges happen in quick succession
                let startX, startY;
                if (this.mergeTransition.active) {
                    // Continue from current animated position
                    const elapsed = Date.now() - this.mergeTransition.startTime;
                    const progress = Math.min(1, elapsed / this.mergeTransition.duration);
                    const easedProgress = 1 - Math.pow(1 - progress, 3);

                    startX = this.mergeTransition.startX +
                        (this.mergeTransition.targetX - this.mergeTransition.startX) * easedProgress;
                    startY = this.mergeTransition.startY +
                        (this.mergeTransition.targetY - this.mergeTransition.startY) * easedProgress;

                    console.log('🔀 Blending from existing transition at', (progress * 100).toFixed(1) + '%');
                } else {
                    // Start fresh from previous position
                    startX = this.playerState.previous.x;
                    startY = this.playerState.previous.y;
                }

                console.log('📍 Merge transition started:', {
                    from: { x: startX, y: startY },
                    to: { x: this.playerState.current.x, y: this.playerState.current.y },
                    distance: Math.hypot(
                        this.playerState.current.x - startX,
                        this.playerState.current.y - startY
                    )
                });

                // Start smooth camera transition for merge
                // Camera was at the average of previous cells, now needs to move to average of current cells
                this.mergeTransition.active = true;
                this.mergeTransition.startX = startX;
                this.mergeTransition.startY = startY;
                this.mergeTransition.targetX = this.playerState.current.x;
                this.mergeTransition.targetY = this.playerState.current.y;
                this.mergeTransition.progress = 0;
                this.mergeTransition.startTime = Date.now();

                return { type: 'merge', from: previousCount, to: currentCount };
            } else if (currentCount > previousCount) {
                console.log(`💥 Cell split! ${previousCount} → ${currentCount}`);
                return { type: 'split', from: previousCount, to: currentCount };
            }
        }
    }

    /**
     * Update state for other players
     */
    updateOtherPlayer(playerId, userData, timestamp) {
        if (!config.predictionEnabled) return userData.cells;

        if (!this.otherPlayers.states[playerId]) {
            // First time seeing this player
            this.otherPlayers.states[playerId] = {
                previous: { cells: [], timestamp: timestamp },
                current: { cells: this.cloneCells(userData.cells), timestamp: timestamp },
                velocities: []
            };
            return userData.cells;
        }

        // Update states
        const playerState = this.otherPlayers.states[playerId];
        playerState.previous = playerState.current;
        playerState.current = {
            cells: this.cloneCells(userData.cells),
            timestamp: timestamp
        };

        // Calculate velocities
        const timeDelta = playerState.current.timestamp - playerState.previous.timestamp;

        if (timeDelta > config.predictionMinTimeDelta &&
            playerState.current.cells.length === playerState.previous.cells.length) {

            playerState.velocities = [];
            for (let j = 0; j < playerState.current.cells.length; j++) {
                const currCell = playerState.current.cells[j];
                const prevCell = playerState.previous.cells[j];
                let cellVx = (currCell.x - prevCell.x) / timeDelta;
                let cellVy = (currCell.y - prevCell.y) / timeDelta;

                // Cap velocity
                const cellVelMagnitude = Math.sqrt(cellVx * cellVx + cellVy * cellVy);
                if (cellVelMagnitude > config.predictionMaxVelocity) {
                    const cellScale = config.predictionMaxVelocity / cellVelMagnitude;
                    cellVx *= cellScale;
                    cellVy *= cellScale;
                }
                playerState.velocities.push({ vx: cellVx, vy: cellVy });
            }
        } else {
            playerState.velocities = [];
        }

        return userData.cells;
    }

    /**
     * Extrapolate positions forward in time
     */
    extrapolate(currentTime) {
        if (!config.predictionEnabled) {
            // Return predicted state (which is just the server state when prediction is disabled)
            // If no data yet, return null
            if (!this.playerState.current.timestamp) {
                return null;
            }
            return this.playerState.predicted;
        }

        // If we don't have any data yet, return empty state
        if (!this.playerState.current.timestamp) {
            return null;
        }

        const timeSinceUpdate = currentTime - this.playerState.current.timestamp;

        // Limit extrapolation to prevent overshooting
        const clampedTime = Math.min(
            Math.max(0, timeSinceUpdate),
            config.predictionMaxExtrapolation
        );

        // Extrapolate player camera position
        this.playerState.predicted.x = this.playerState.current.x +
            this.playerState.velocity.x * clampedTime;
        this.playerState.predicted.y = this.playerState.current.y +
            this.playerState.velocity.y * clampedTime;

        // Extrapolate cell positions
        if (this.playerState.cellVelocities.length === this.playerState.current.cells.length) {
            this.playerState.predicted.cells = [];
            for (let i = 0; i < this.playerState.current.cells.length; i++) {
                const cell = this.playerState.current.cells[i];
                const vel = this.playerState.cellVelocities[i];
                this.playerState.predicted.cells.push({
                    x: cell.x + vel.vx * clampedTime,
                    y: cell.y + vel.vy * clampedTime,
                    mass: cell.mass,
                    radius: cell.radius,
                    score: cell.score
                });
            }
        } else {
            // No velocity data - use current state
            this.playerState.predicted.cells = this.cloneCells(this.playerState.current.cells);
        }

        // Apply smooth merge transition if active
        if (this.mergeTransition.active) {
            const elapsed = Date.now() - this.mergeTransition.startTime;
            const progress = Math.min(1, elapsed / this.mergeTransition.duration);

            // Use easing function for smoother animation (cubic ease-out)
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            // Interpolate camera position during merge
            const transitionX = this.mergeTransition.startX +
                (this.mergeTransition.targetX - this.mergeTransition.startX) * easedProgress;
            const transitionY = this.mergeTransition.startY +
                (this.mergeTransition.targetY - this.mergeTransition.startY) * easedProgress;

            // Override predicted camera position with transition position
            this.playerState.predicted.x = transitionX;
            this.playerState.predicted.y = transitionY;

            // Log transition progress (only log every 10th frame to avoid spam)
            if (Math.random() < 0.1) {
                console.log(`🎬 Merge transition: ${(progress * 100).toFixed(1)}% complete`);
            }

            // End transition when complete
            if (progress >= 1) {
                this.mergeTransition.active = false;
                console.log('✅ Merge transition complete');
            }
        }

        return this.playerState.predicted;
    }

    /**
     * Extrapolate other player's cells
     */
    extrapolateOtherPlayer(playerId, currentTime) {
        if (!config.predictionEnabled) return null;

        const playerState = this.otherPlayers.states[playerId];
        if (!playerState || playerState.velocities.length === 0) {
            return null;
        }

        const timeSinceUpdate = currentTime - playerState.current.timestamp;
        const clampedTime = Math.min(
            Math.max(0, timeSinceUpdate),
            config.predictionMaxExtrapolation
        );

        if (playerState.velocities.length !== playerState.current.cells.length) {
            return null;
        }

        const predictedCells = [];
        for (let j = 0; j < playerState.current.cells.length; j++) {
            const cell = playerState.current.cells[j];
            const vel = playerState.velocities[j];
            predictedCells.push({
                x: cell.x + vel.vx * clampedTime,
                y: cell.y + vel.vy * clampedTime,
                mass: cell.mass,
                radius: cell.radius,
                score: cell.score
            });
        }

        return predictedCells;
    }

    /**
     * Clean up disconnected players
     */
    cleanupDisconnectedPlayers(activePlayerIds) {
        for (const playerId in this.otherPlayers.states) {
            if (!activePlayerIds[playerId]) {
                delete this.otherPlayers.states[playerId];
            }
        }
    }

    /**
     * Get current predicted state
     */
    getPredictedState() {
        return this.playerState.predicted;
    }

    /**
     * Get average update rate (UPS)
     */
    getUpdateRate() {
        if (this.updateTimes.length === 0) return 0;
        const avgUpdateTime = this.updateTimes.reduce((sum, time) => sum + time, 0) /
            this.updateTimes.length;
        return Math.round(1000 / avgUpdateTime);
    }

    /**
     * Optimized cell cloning
     */
    cloneCells(cells) {
        if (!cells || cells.length === 0) return [];

        const cloned = new Array(cells.length);
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            cloned[i] = {
                x: cell.x,
                y: cell.y,
                mass: cell.mass,
                radius: cell.radius,
                score: cell.score
            };
        }
        return cloned;
    }

    /**
     * Reset prediction system
     */
    reset() {
        this.playerState = {
            previous: { x: 0, y: 0, cells: [], timestamp: 0 },
            current: { x: 0, y: 0, cells: [], timestamp: 0 },
            predicted: { x: 0, y: 0, cells: [] },
            velocity: { x: 0, y: 0 },
            cellVelocities: []
        };

        this.otherPlayers = {
            states: {},
            timestamp: 0
        };

        this.mergeTransition = {
            active: false,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0,
            progress: 0,
            duration: 500
        };

        this.lastUpdateTime = 0;
        this.updateTimes = [];
    }
}

module.exports = PredictionSystem;