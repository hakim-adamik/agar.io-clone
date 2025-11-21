"use strict";

const util = require('../lib/util');
const sat = require('sat');
const gameLogic = require('../game-logic');

class Cell {
    constructor(x, y, mass, speed, config) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.radius = util.massToRadius(mass);
        this.speed = speed;
        this.config = config; // Store config for movement calculations

        // Velocity for inertia-based movement
        this.velocityX = 0;
        this.velocityY = 0;

        // Split state tracking
        this.splitTime = null; // When this cell was created from a split
        this.isSplitCell = false;
        this.timeToMerge = null; // Per-cell timer for when this cell can merge
        this.isMainCellAfterVirusSplit = false; // If true, this cell won't be pushed by collisions temporarily
        this.virusSplitProtectionUntil = null; // Timestamp until which the cell is protected from pushing
    }

    setMass(mass) {
        this.mass = mass;
        this.recalculateRadius();
    }

    addMass(mass) {
        this.setMass(this.mass + mass);
    }

    recalculateRadius() {
        this.radius = util.massToRadius(this.mass);
    }

    toCircle() {
        return new sat.Circle(new sat.Vector(this.x, this.y), this.radius);
    }

    move(playerX, playerY, playerTarget, slowBase, initMassLog) {
        var target = {
            x: playerX - this.x + playerTarget.x,
            y: playerY - this.y + playerTarget.y
        };
        var dist = Math.hypot(target.y, target.x);
        var deg = Math.atan2(target.y, target.x);
        var slowDown = 1;
        if (this.speed <= this.config.minSpeed) {
            slowDown = util.mathLog(this.mass, slowBase) - initMassLog + 1;
        }

        // Calculate cursor influence based on split state
        var cursorInfluence = 1.0; // Default: full cursor control

        if (this.isSplitCell && this.splitTime !== null) {
            var splitAge = Date.now() - this.splitTime;
            var splitDelay = this.config.splitControlDelay || 400;

            if (splitAge < splitDelay) {
                // During split phase: gradually increase cursor influence from 0% to 100%
                cursorInfluence = splitAge / splitDelay;
            } else {
                // Split phase over, clear split state
                this.isSplitCell = false;
                this.splitTime = null;
            }
        }

        // Calculate target velocity (direction we want to go)
        var targetVelocityX = this.speed * Math.cos(deg) / slowDown;
        var targetVelocityY = this.speed * Math.sin(deg) / slowDown;

        // Apply distance-based slowdown
        if (dist < (this.config.minDistance + this.radius)) {
            var distanceFactor = dist / (this.config.minDistance + this.radius);
            targetVelocityX *= distanceFactor;
            targetVelocityY *= distanceFactor;
        }

        // Blend between current velocity (split momentum) and target velocity (cursor direction)
        // During split: mostly maintains current direction, gradually transitions to cursor
        var inertiaFactor = this.config.cellInertia || 0.15;
        var blendedTargetX = this.velocityX + (targetVelocityX - this.velocityX) * cursorInfluence;
        var blendedTargetY = this.velocityY + (targetVelocityY - this.velocityY) * cursorInfluence;

        // Interpolate current velocity towards blended target
        this.velocityX += (blendedTargetX - this.velocityX) * inertiaFactor;
        this.velocityY += (blendedTargetY - this.velocityY) * inertiaFactor;

        // Apply velocity to position
        if (!isNaN(this.velocityX)) {
            this.x += this.velocityX;
        }
        if (!isNaN(this.velocityY)) {
            this.y += this.velocityY;
        }

        // Decrease speed after split
        if (this.speed > this.config.minSpeed) {
            this.speed -= this.config.speedDecrement;
        }
    }

    // 0: nothing happened
    // 1: A ate B
    // 2: B ate A
    static checkWhoAteWho(cellA, cellB) {
        if (!cellA || !cellB) return 0;
        let response = new sat.Response();
        let colliding = sat.testCircleCircle(cellA.toCircle(), cellB.toCircle(), response);
        if (!colliding) return 0;
        if (response.bInA) return 1;
        if (response.aInB) return 2;
        return 0;
    }
}

exports.Player = class {
    constructor(id, config) {
        this.id = id;
        this.hue = Math.round(Math.random() * 360);
        this.name = null;
        this.admin = false;
        this.screenWidth = null;
        this.screenHeight = null;
        this.config = config; // Store config for all settings
        this.lastSplitTime = 0; // Track last split to prevent spam
        this.isSplitting = false; // Flag to prevent concurrent splits
    }

    /* Initalizes things that change with every respawn */
    init(position, defaultPlayerMass) {
        this.cells = [new Cell(position.x, position.y, defaultPlayerMass, this.config.minSpeed, this.config)];
        this.massTotal = defaultPlayerMass;
        this.defaultPlayerMass = defaultPlayerMass;
        this.x = position.x;
        this.y = position.y;
        this.target = {
            x: 0,
            y: 0
        };
    }

    /* Calculate score for a specific cell: mass - (defaultPlayerMass / number of cells) */
    getCellScore(cell) {
        return cell.mass - (this.defaultPlayerMass / this.cells.length);
    }

    /* Calculate player's total score (sum of all cell scores) */
    getScore() {
        let totalScore = 0;
        for (let cell of this.cells) {
            totalScore += this.getCellScore(cell);
        }
        return Math.max(0, totalScore);
    }

    clientProvidedData(playerData) {
        this.name = playerData.name;
        this.screenWidth = playerData.screenWidth;
        this.screenHeight = playerData.screenHeight;
    }

    setMergeTimer() {
        // Set timer for when each cell can merge, based on its mass
        const now = Date.now();
        for (let cell of this.cells) {
            const mergeDelay = this.config.mergeTimeBase + (cell.mass * this.config.mergeTimeRate);
            cell.timeToMerge = now + mergeDelay;
        }
    }

    loseMassIfNeeded(massLossRate, defaultPlayerMass, minMassLoss) {
        // Safety check: ensure cells array exists
        if (!this.cells) {
            return;
        }

        for (let i in this.cells) {
            if (this.cells[i].mass * (1 - (massLossRate / 1000)) > defaultPlayerMass && this.massTotal > minMassLoss) {
                var massLoss = this.cells[i].mass * (massLossRate / 1000);
                this.changeCellMass(i, -massLoss);
            }
        }
    }

    changeCellMass(cellIndex, massDifference) {
        this.cells[cellIndex].addMass(massDifference);
        this.massTotal += massDifference;
    }

    removeCell(cellIndex) {
        this.massTotal -= this.cells[cellIndex].mass;
        this.cells.splice(cellIndex, 1);
        return this.cells.length === 0;
    }


    // Splits a cell into multiple cells with identical mass
    // Creates n-1 new cells, and lowers the mass of the original cell
    // If the resulting cells would be smaller than minSplitMass, creates fewer and bigger cells.
    // splitDirection is optional {x, y} for user-initiated splits towards cursor
    splitCell(cellIndex, maxRequestedPieces, minSplitMass, splitDirection = null) {
        let cellToSplit = this.cells[cellIndex];
        let maxAllowedPieces = Math.floor(cellToSplit.mass / minSplitMass); // If we split the cell ino more pieces, they will be too small.
        let piecesToCreate = Math.min(maxAllowedPieces, maxRequestedPieces);

        if (piecesToCreate <= 1) {
            return; // Need at least 2 pieces to split
        }

        let newCellsMass = cellToSplit.mass / piecesToCreate;

        // Calculate split velocity if direction provided
        let splitVelocityX = 0;
        let splitVelocityY = 0;

        if (splitDirection) {
            let angle = Math.atan2(splitDirection.y, splitDirection.x);
            splitVelocityX = this.config.splitCellSpeed * Math.cos(angle);
            splitVelocityY = this.config.splitCellSpeed * Math.sin(angle);
        }

        // Calculate merge timer for newly split cells
        const now = Date.now();
        const mergeDelay = this.config.mergeTimeBase + (newCellsMass * this.config.mergeTimeRate);
        const mergeTime = now + mergeDelay;

        for (let i = 0; i < piecesToCreate - 1; i++) {
            let newCell = new Cell(cellToSplit.x, cellToSplit.y, newCellsMass, this.config.splitCellSpeed, this.config);
            newCell.timeToMerge = mergeTime; // Set merge timer for new cell

            if (splitDirection) {
                // Mark as split cell and set initial velocity in split direction
                newCell.isSplitCell = true;
                newCell.splitTime = Date.now();
                newCell.velocityX = splitVelocityX;
                newCell.velocityY = splitVelocityY;
            } else {
                // No direction (virus split): inherit parent velocity
                newCell.velocityX = cellToSplit.velocityX;
                newCell.velocityY = cellToSplit.velocityY;
            }

            this.cells.push(newCell);
        }

        cellToSplit.setMass(newCellsMass);
        cellToSplit.timeToMerge = mergeTime; // Update merge timer for original cell

        // Mark the original cell as split to maintain its current momentum (reduced cursor influence)
        // but DON'T change its velocity - it keeps moving in its current direction
        if (splitDirection) {
            cellToSplit.isSplitCell = true;
            cellToSplit.splitTime = Date.now();
            // Keep cellToSplit.velocityX and velocityY unchanged - maintains current momentum
        }
    }

    // Performs a split resulting from colliding with a virus.
    // Creates multiple small cells and one large cell with remaining mass
    virusSplit(cellIndexes, maxCells, minSplitMass) {
        // Safety check: ensure cells array exists
        if (!this.cells || this.cells.length === 0) {
            return;
        }

        for (let cellIndex of cellIndexes) {
            let cellToSplit = this.cells[cellIndex];
            if (!cellToSplit) continue;

            // Calculate how many cells we can create
            let maxRequestedPieces = maxCells - this.cells.length + 1;
            let maxAllowedPieces = Math.floor(cellToSplit.mass / minSplitMass);
            let piecesToCreate = Math.min(maxAllowedPieces, maxRequestedPieces);

            if (piecesToCreate <= 1) {
                continue; // Need at least 2 pieces to split
            }

            // Small cells get the minimum mass, large cell keeps the rest
            let smallCellMass = minSplitMass;
            let numberOfSmallCells = piecesToCreate - 1;
            let largeCellMass = cellToSplit.mass - (smallCellMass * numberOfSmallCells);

            // If large cell would be too small, adjust
            if (largeCellMass < minSplitMass) {
                // Reduce number of small cells
                numberOfSmallCells = Math.floor((cellToSplit.mass - minSplitMass) / minSplitMass);
                largeCellMass = cellToSplit.mass - (smallCellMass * numberOfSmallCells);
            }

            if (numberOfSmallCells <= 0) {
                continue; // Can't split this cell
            }

            // Calculate merge timers for newly split cells
            const now = Date.now();
            const smallCellMergeDelay = this.config.mergeTimeBase + (smallCellMass * this.config.mergeTimeRate);
            const largeCellMergeDelay = this.config.mergeTimeBase + (largeCellMass * this.config.mergeTimeRate);
            const smallCellMergeTime = now + smallCellMergeDelay;
            const largeCellMergeTime = now + largeCellMergeDelay;

            // Explosion speed proportional to parent cell's mass
            // Larger cells need faster explosion to clear their radius
            let massScale = Math.sqrt(cellToSplit.mass / minSplitMass); // Square root for more gradual scaling
            let explosionSpeed = this.config.splitCellSpeed * massScale * 0.15;

            // Create small cells that explode away in all directions
            for (let i = 0; i < numberOfSmallCells; i++) {
                // Random angle for explosion effect
                let angle = (Math.PI * 2 * i) / numberOfSmallCells + (Math.random() - 0.5) * 0.5;
                let velocityX = explosionSpeed * Math.cos(angle);
                let velocityY = explosionSpeed * Math.sin(angle);

                let newCell = new Cell(cellToSplit.x, cellToSplit.y, smallCellMass, explosionSpeed, this.config);
                newCell.isSplitCell = true;
                newCell.splitTime = Date.now();
                newCell.velocityX = velocityX;
                newCell.velocityY = velocityY;
                newCell.timeToMerge = smallCellMergeTime; // Set merge timer for small cell

                this.cells.push(newCell);
            }

            // Original cell becomes the large cell with remaining mass
            // Keep position, velocity, and movement behavior unchanged - only mass changes
            cellToSplit.setMass(largeCellMass);
            cellToSplit.timeToMerge = largeCellMergeTime; // Set merge timer for large cell
            // Don't mark as split cell - it should continue moving normally
            // velocityX, velocityY, isSplitCell, and splitTime all remain unchanged

            // Protect main cell from being pushed by explosion for a brief moment
            cellToSplit.isMainCellAfterVirusSplit = true;
            cellToSplit.virusSplitProtectionUntil = now + 200; // 200ms protection
        }
    }

    // Performs a split initiated by the player.
    // Tries to split every cell in half.
    userSplit(maxCells, minSplitMass) {
        // Prevent concurrent split execution (critical section)
        if (this.isSplitting) {
            return; // Already processing a split
        }

        // Safety check: ensure cells array exists
        if (!this.cells || this.cells.length === 0) {
            return;
        }

        // Prevent split spam with cooldown (150ms minimum between splits)
        const now = Date.now();
        const splitCooldown = 150; // milliseconds
        if (now - this.lastSplitTime < splitCooldown) {
            return; // Too soon since last split
        }

        // If already at max cells, can't split anymore
        if (this.cells.length >= maxCells) {
            return;
        }

        // Set flag to block concurrent splits
        this.isSplitting = true;

        // Update last split time
        this.lastSplitTime = now;

        let cellsToCreate;
        if (this.cells.length > maxCells / 2) { // Not every cell can be split
            cellsToCreate = maxCells - this.cells.length;

            this.cells.sort(function (a, b) { // Sort the cells so the biggest ones will be split
                return b.mass - a.mass;
            });
        } else { // Every cell can be split
            cellsToCreate = this.cells.length;
        }

        for (let i = 0; i < cellsToCreate; i++) {
            // Calculate split direction: from cell towards cursor
            let cell = this.cells[i];
            let splitDirection = {
                x: this.x - cell.x + this.target.x,
                y: this.y - cell.y + this.target.y
            };

            this.splitCell(i, 2, minSplitMass, splitDirection);
        }

        // Clear flag after split operations complete
        this.isSplitting = false;
    }

    // Loops trough cells, and calls callback with colliding ones
    // Passes the colliding cells and their indexes to the callback
    // null values are skipped during the iteration and removed at the end
    enumerateCollidingCells(callback) {
        for (let cellAIndex = 0; cellAIndex < this.cells.length; cellAIndex++) {
            let cellA = this.cells[cellAIndex];
            if (!cellA) continue; // cell has already been merged

            for (let cellBIndex = cellAIndex + 1; cellBIndex < this.cells.length; cellBIndex++) {
                let cellB = this.cells[cellBIndex];
                if (!cellB) continue;
                let colliding = sat.testCircleCircle(cellA.toCircle(), cellB.toCircle());
                if (colliding) {
                    callback(this.cells, cellAIndex, cellBIndex);
                }
            }
        }

        this.cells = util.removeNulls(this.cells);
    }

    // Loops through cells and calls callback only for cells that overlap enough to merge
    // Requires cells to overlap by mergeOverlapThreshold fraction of their radius
    enumerateMergingCells(callback) {
        const overlapThreshold = this.config.mergeOverlapThreshold || 0;

        for (let cellAIndex = 0; cellAIndex < this.cells.length; cellAIndex++) {
            let cellA = this.cells[cellAIndex];
            if (!cellA) continue;

            for (let cellBIndex = cellAIndex + 1; cellBIndex < this.cells.length; cellBIndex++) {
                let cellB = this.cells[cellBIndex];
                if (!cellB) continue;

                // Calculate distance between cell centers
                let dx = cellB.x - cellA.x;
                let dy = cellB.y - cellA.y;
                let distance = Math.hypot(dx, dy);

                // Calculate required distance for merging (with overlap threshold)
                // Average radius of both cells, then subtract overlap threshold
                let avgRadius = (cellA.radius + cellB.radius) / 2;
                let requiredDistance = cellA.radius + cellB.radius - (avgRadius * overlapThreshold);

                // Only merge if cells overlap enough
                if (distance < requiredDistance) {
                    callback(this.cells, cellAIndex, cellBIndex);
                }
            }
        }

        this.cells = util.removeNulls(this.cells);
    }

    move(slowBase, gameWidth, gameHeight, initMassLog) {
        // Safety check: ensure cells array exists
        if (!this.cells || this.cells.length === 0) {
            return;
        }

        if (this.cells.length > 1) {
            const now = Date.now();
            const overlapThreshold = this.config.mergeOverlapThreshold || 0;

            // Check all colliding cells to handle both separation and merging
            this.enumerateCollidingCells((cells, cellAIndex, cellBIndex) => {
                let cellA = cells[cellAIndex];
                let cellB = cells[cellBIndex];

                if (!cellA || !cellB) {
                    return; // One or both cells already merged, skip
                }

                // Check if both cells' merge timers have elapsed
                const canMerge = (cellA.timeToMerge === null || now >= cellA.timeToMerge) &&
                                 (cellB.timeToMerge === null || now >= cellB.timeToMerge);

                if (canMerge) {
                    // Timers elapsed - check if overlap is sufficient for merging
                    let dx = cellB.x - cellA.x;
                    let dy = cellB.y - cellA.y;
                    let distance = Math.hypot(dx, dy);

                    // Calculate required distance for merging (with overlap threshold)
                    let avgRadius = (cellA.radius + cellB.radius) / 2;
                    let mergeDistance = cellA.radius + cellB.radius - (avgRadius * overlapThreshold);

                    if (distance < mergeDistance) {
                        // Sufficient overlap - merge cells
                        if (cellA.mass >= cellB.mass) {
                            cellA.addMass(cellB.mass);
                            cells[cellBIndex] = null;
                        } else {
                            cellB.addMass(cellA.mass);
                            cells[cellAIndex] = null;
                        }
                    }
                    // If not enough overlap, let them move naturally (no pushing)
                } else {
                    // Timer not elapsed - push cells apart to maintain separation
                    // Cells should not overlap at all during the separation phase
                    if (this.config.pushingAwaySpeed > 0) {
                        // Check if either cell is protected from virus split pushing
                        const cellAProtected = cellA.virusSplitProtectionUntil && now < cellA.virusSplitProtectionUntil;
                        const cellBProtected = cellB.virusSplitProtectionUntil && now < cellB.virusSplitProtectionUntil;

                        let dx = cellB.x - cellA.x;
                        let dy = cellB.y - cellA.y;
                        let vector = new sat.Vector(dx, dy);
                        vector = vector.normalize().scale(this.config.pushingAwaySpeed, this.config.pushingAwaySpeed);
                        if (vector.len() == 0) {
                            vector = new sat.Vector(0, 1);
                        }

                        // Only push cells that aren't protected
                        if (!cellAProtected) {
                            cellA.x -= vector.x;
                            cellA.y -= vector.y;
                        }
                        if (!cellBProtected) {
                            cellB.x += vector.x;
                            cellB.y += vector.y;
                        }
                    }
                }
            });
            this.cells = util.removeNulls(this.cells);

            // Clear virus split protection for cells whose protection has expired
            for (let cell of this.cells) {
                if (cell.virusSplitProtectionUntil && now >= cell.virusSplitProtectionUntil) {
                    cell.isMainCellAfterVirusSplit = false;
                    cell.virusSplitProtectionUntil = null;
                }
            }
        }

        let xSum = 0, ySum = 0;
        for (let i = 0; i < this.cells.length; i++) {
            let cell = this.cells[i];
            cell.move(this.x, this.y, this.target, slowBase, initMassLog);
            gameLogic.adjustForBoundaries(cell, cell.radius/3, 0, gameWidth, gameHeight);

            xSum += cell.x;
            ySum += cell.y;
        }
        this.x = xSum / this.cells.length;
        this.y = ySum / this.cells.length;
    }

    // Calls `callback` if any of the two cells ate the other.
    static checkForCollisions(playerA, playerB, playerAIndex, playerBIndex, callback) {
        for (let cellAIndex in playerA.cells) {
            for (let cellBIndex in playerB.cells) {
                let cellA = playerA.cells[cellAIndex];
                let cellB = playerB.cells[cellBIndex];

                let cellAData = { playerIndex: playerAIndex, cellIndex: cellAIndex };
                let cellBData = { playerIndex: playerBIndex, cellIndex: cellBIndex };

                let whoAteWho = Cell.checkWhoAteWho(cellA, cellB);

                if (whoAteWho == 1) {
                    callback(cellBData, cellAData);
                } else if (whoAteWho == 2) {
                    callback(cellAData, cellBData);
                }
            }
        }
    }
}
exports.PlayerManager = class {
    constructor() {
        this.data = [];
    }

    pushNew(player) {
        this.data.push(player);
    }

    findIndexByID(id) {
        return util.findIndex(this.data, id);
    }

    removePlayerByID(id) {
        let index = this.findIndexByID(id);
        if (index > -1) {
            this.removePlayerByIndex(index);
        }
    }

    removePlayerByIndex(index) {
        this.data.splice(index, 1);
    }

    shrinkCells(massLossRate, defaultPlayerMass, minMassLoss) {
        for (let player of this.data) {
            player.loseMassIfNeeded(massLossRate, defaultPlayerMass, minMassLoss);
        }
    }

    removeCell(playerIndex, cellIndex) {
        return this.data[playerIndex].removeCell(cellIndex);
    }

    getCell(playerIndex, cellIndex) {
        return this.data[playerIndex].cells[cellIndex]
    }

    handleCollisions(callback) {
        for (let playerAIndex = 0; playerAIndex < this.data.length; playerAIndex++) {
            for (let playerBIndex = playerAIndex + 1; playerBIndex < this.data.length; playerBIndex++) {
                exports.Player.checkForCollisions(
                    this.data[playerAIndex],
                    this.data[playerBIndex],
                    playerAIndex,
                    playerBIndex,
                    callback
                );
            }
        }
    }

    getTopPlayers() {
        this.data.sort(function (a, b) { return b.getScore() - a.getScore(); });
        var topPlayers = [];
        for (var i = 0; i < Math.min(10, this.data.length); i++) {
            var score = this.data[i].getScore();
            topPlayers.push({
                id: this.data[i].id,
                name: this.data[i].name,
                score: Math.round(score * 100) / 100 // Round to 2 decimals for display
            });
        }
        return topPlayers;
    }

    getTotalMass() {
        let result = 0;
        for (let player of this.data) {
            result += player.massTotal;
        }
        return result;
    }
}
