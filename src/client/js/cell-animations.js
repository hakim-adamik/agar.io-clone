/**
 * Cell merge animation system
 * Handles smooth visual transitions when cells merge
 */

class CellAnimations {
    constructor(options = {}) {
        // Configuration
        this.config = {
            enabled: options.enabled !== undefined ? options.enabled : false, // Currently disabled due to bugs
            duration: options.duration || 500,  // Animation duration in ms
            easingFunction: options.easingFunction || 'cubicEaseOut'
        };

        // Active animations
        // Map of "playerId_cellIndex" -> animation state
        this.animations = {};

        // Track cell states to detect merges
        // Map of playerId -> array of cell states
        this.previousCellStates = {};

        // Performance tracking
        this.activeAnimationCount = 0;
    }

    /**
     * Enable or disable animations
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (!enabled) {
            this.reset();
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
    }

    /**
     * Start a new merge animation for a cell
     */
    startAnimation(playerId, cellIndex, startRadius, targetRadius) {
        if (!this.config.enabled) return;

        const key = `${playerId}_${cellIndex}`;

        // Check if there's already an animation in progress
        const existingAnimation = this.animations[key];
        if (existingAnimation) {
            const targetDiff = Math.abs(existingAnimation.targetRadius - targetRadius);
            if (targetDiff < 5) {
                // Target is very similar, don't restart
                return;
            }

            // Target changed significantly - use current animated radius as new start
            const now = this.getTime();
            const elapsed = now - existingAnimation.startTime;

            if (elapsed < existingAnimation.duration) {
                // Animation in progress - calculate current radius for smooth continuation
                const progress = this.calculateProgress(elapsed, existingAnimation.duration);
                const currentRadius = existingAnimation.startRadius +
                    (existingAnimation.targetRadius - existingAnimation.startRadius) * progress;
                startRadius = currentRadius;
            }
        }

        const now = this.getTime();
        this.animations[key] = {
            startRadius: startRadius,
            targetRadius: targetRadius,
            startTime: now,
            duration: this.config.duration
        };

        this.activeAnimationCount = Object.keys(this.animations).length;
    }

    /**
     * Get the current animated radius for a cell
     */
    getAnimatedRadius(playerId, cellIndex, actualRadius) {
        if (!this.config.enabled) {
            return actualRadius;
        }

        const key = `${playerId}_${cellIndex}`;
        const animation = this.animations[key];

        if (!animation) {
            return actualRadius;
        }

        const now = this.getTime();
        const elapsed = now - animation.startTime;

        if (elapsed >= animation.duration) {
            // Animation complete
            delete this.animations[key];
            this.activeAnimationCount = Object.keys(this.animations).length;
            return actualRadius;
        }

        // Calculate animated radius using easing
        const progress = this.calculateProgress(elapsed, animation.duration);
        const currentRadius = animation.startRadius +
            (animation.targetRadius - animation.startRadius) * progress;

        return currentRadius;
    }

    /**
     * Calculate easing progress
     */
    calculateProgress(elapsed, duration) {
        const linear = elapsed / duration;

        switch (this.config.easingFunction) {
            case 'linear':
                return linear;
            case 'cubicEaseOut':
                return 1 - Math.pow(1 - linear, 3);
            case 'quadraticEaseOut':
                return 1 - Math.pow(1 - linear, 2);
            case 'exponentialEaseOut':
                return linear === 1 ? 1 : 1 - Math.pow(2, -10 * linear);
            default:
                return 1 - Math.pow(1 - linear, 3); // Default to cubic ease-out
        }
    }

    /**
     * Detect merges by comparing cell states
     */
    detectMerges(playerId, newCells) {
        if (!this.config.enabled) return null;

        const previousCells = this.previousCellStates[playerId];

        if (!previousCells || previousCells.length === 0) {
            // First time seeing this player
            this.previousCellStates[playerId] = this.cloneCellStates(newCells);
            return null;
        }

        const mergeEvents = [];

        // If cell count decreased, cells merged
        if (newCells.length < previousCells.length) {
            // Find which cells grew (received mass from merged cells)
            for (let i = 0; i < newCells.length; i++) {
                const newCell = newCells[i];

                if (!this.isValidCell(newCell)) continue;

                // Find nearby cells from previous state
                const nearbyCells = this.findNearbyCells(newCell, previousCells, 200);

                if (nearbyCells && nearbyCells.length > 0) {
                    // Use largest nearby cell's radius as starting point
                    const largestPrevCell = nearbyCells.reduce((max, cell) =>
                        (cell && cell.radius > max.radius) ? cell : max
                    );

                    if (largestPrevCell && newCell.mass > largestPrevCell.mass * 1.2) {
                        // Mass increased significantly - this cell absorbed another
                        this.startAnimation(playerId, i, largestPrevCell.radius, newCell.radius);
                        mergeEvents.push({
                            type: 'merge',
                            cellIndex: i,
                            fromRadius: largestPrevCell.radius,
                            toRadius: newCell.radius
                        });
                    }
                }
            }
        } else if (newCells.length === previousCells.length) {
            // Same number of cells - check if any grew significantly
            for (let i = 0; i < newCells.length; i++) {
                const newCell = newCells[i];
                const matchedPrevCell = this.findMatchingCell(newCell, previousCells);

                if (matchedPrevCell && newCell.mass > matchedPrevCell.mass * 1.2) {
                    // Mass increased significantly
                    this.startAnimation(playerId, i, matchedPrevCell.radius, newCell.radius);
                    mergeEvents.push({
                        type: 'growth',
                        cellIndex: i,
                        fromRadius: matchedPrevCell.radius,
                        toRadius: newCell.radius
                    });
                }
            }
        }

        // Update stored state
        this.previousCellStates[playerId] = this.cloneCellStates(newCells);

        return mergeEvents.length > 0 ? mergeEvents : null;
    }

    /**
     * Find matching cell in previous state by proximity
     */
    findMatchingCell(cell, previousCells) {
        let closestCell = null;
        let closestDistance = Infinity;

        for (let i = 0; i < previousCells.length; i++) {
            const prevCell = previousCells[i];
            if (!this.isValidCell(prevCell)) continue;

            const dx = cell.x - prevCell.x;
            const dy = cell.y - prevCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Cell should be relatively close
            if (distance < 200 && distance < closestDistance) {
                closestDistance = distance;
                closestCell = prevCell;
            }
        }

        return closestCell;
    }

    /**
     * Find all nearby cells within a given distance
     */
    findNearbyCells(cell, previousCells, maxDistance) {
        const nearbyCells = [];

        if (!this.isValidCell(cell) || !Array.isArray(previousCells)) {
            return nearbyCells;
        }

        for (let i = 0; i < previousCells.length; i++) {
            const prevCell = previousCells[i];
            if (!this.isValidCell(prevCell)) continue;

            const dx = cell.x - prevCell.x;
            const dy = cell.y - prevCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < maxDistance) {
                nearbyCells.push(prevCell);
            }
        }

        return nearbyCells;
    }

    /**
     * Validate cell has required properties
     */
    isValidCell(cell) {
        return cell &&
            typeof cell.x === 'number' &&
            typeof cell.y === 'number' &&
            typeof cell.mass === 'number' &&
            typeof cell.radius === 'number';
    }

    /**
     * Clone cell states for comparison
     */
    cloneCellStates(cells) {
        const cloned = [];
        if (!cells || !Array.isArray(cells)) {
            return cloned;
        }

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (this.isValidCell(cell)) {
                cloned.push({
                    x: cell.x,
                    y: cell.y,
                    mass: cell.mass,
                    radius: cell.radius
                });
            }
        }
        return cloned;
    }

    /**
     * Clean up states for disconnected players
     */
    cleanupDisconnectedPlayers(activePlayerIds) {
        // Clean up previous states
        for (const playerId in this.previousCellStates) {
            if (!activePlayerIds[playerId]) {
                delete this.previousCellStates[playerId];
            }
        }

        // Clean up animations
        for (const key in this.animations) {
            const playerId = key.split('_')[0];
            if (!activePlayerIds[playerId]) {
                delete this.animations[key];
            }
        }

        this.activeAnimationCount = Object.keys(this.animations).length;
    }

    /**
     * Get statistics about active animations
     */
    getStats() {
        return {
            enabled: this.config.enabled,
            activeAnimations: this.activeAnimationCount,
            trackedPlayers: Object.keys(this.previousCellStates).length
        };
    }

    /**
     * Get time (uses performance.now if available)
     */
    getTime() {
        if (window.performance && window.performance.now) {
            return window.performance.now();
        }
        return Date.now();
    }

    /**
     * Reset all animations and states
     */
    reset() {
        this.animations = {};
        this.previousCellStates = {};
        this.activeAnimationCount = 0;
    }
}

module.exports = CellAnimations;