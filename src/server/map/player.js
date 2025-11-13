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
        this.canMerge = true; // Track if this specific cell is allowed to merge
        this.hasSeparated = true; // Track if this cell has separated from siblings after split
        this.timeToMerge = null; // Per-cell merge timer
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
        var dist = Math.hypot(target.y, target.x)
        var deg = Math.atan2(target.y, target.x);
        var slowDown = 1;
        if (this.speed <= this.config.minSpeed) {
            slowDown = util.mathLog(this.mass, slowBase) - initMassLog + 1;
        }

        var deltaY = this.speed * Math.sin(deg) / slowDown;
        var deltaX = this.speed * Math.cos(deg) / slowDown;

        if (this.speed > this.config.minSpeed) {
            this.speed -= this.config.speedDecrement;
        }
        if (dist < (this.config.minDistance + this.radius)) {
            deltaY *= dist / (this.config.minDistance + this.radius);
            deltaX *= dist / (this.config.minDistance + this.radius);
        }

        if (!isNaN(deltaY)) {
            this.y += deltaY;
        }
        if (!isNaN(deltaX)) {
            this.x += deltaX;
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
        this.setLastHeartbeat();
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
        this.setLastHeartbeat();
    }

    setLastHeartbeat() {
        this.lastHeartbeat = Date.now();
    }

    markCellsAsSplit() {
        // Mark all cells as needing to separate before they can merge
        for (let cell of this.cells) {
            cell.canMerge = false;
            cell.hasSeparated = false;
            cell.timeToMerge = null;
        }
    }

    loseMassIfNeeded(massLossRate, defaultPlayerMass, minMassLoss) {
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
    splitCell(cellIndex, maxRequestedPieces, minSplitMass) {
        let cellToSplit = this.cells[cellIndex];
        let maxAllowedPieces = Math.floor(cellToSplit.mass / minSplitMass); // If we split the cell ino more pieces, they will be too small.
        let piecesToCreate = Math.min(maxAllowedPieces, maxRequestedPieces);
        if (piecesToCreate === 0) {
            return;
        }
        let newCellsMass = cellToSplit.mass / piecesToCreate;
        for (let i = 0; i < piecesToCreate - 1; i++) {
            this.cells.push(new Cell(cellToSplit.x, cellToSplit.y, newCellsMass, this.config.splitCellSpeed, this.config));
        }
        cellToSplit.setMass(newCellsMass);
        this.markCellsAsSplit();
    }

    // Performs a split resulting from colliding with a virus.
    // The player will have the highest possible number of cells.
    virusSplit(cellIndexes, maxCells, minSplitMass) {
        for (let cellIndex of cellIndexes) {
            this.splitCell(cellIndex, maxCells - this.cells.length + 1, minSplitMass);
        }
    }

    // Performs a split initiated by the player.
    // Tries to split every cell in half.
    userSplit(maxCells, minSplitMass) {
        let cellsToCreate;
        if (this.cells.length > maxCells / 2) { // Not every cell can be split
            cellsToCreate = maxCells - this.cells.length + 1;

            this.cells.sort(function (a, b) { // Sort the cells so the biggest ones will be split
                return b.mass - a.mass;
            });
        } else { // Every cell can be split
            cellsToCreate = this.cells.length;
        }

        for (let i = 0; i < cellsToCreate; i++) {
            this.splitCell(i, 2, minSplitMass);
        }
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

    move(slowBase, gameWidth, gameHeight, initMassLog) {
        if (this.cells.length > 1) {
            // Track which cells are currently colliding with any other cell
            const collidingCellIndexes = new Set();

            // Check all pairs for collisions
            for (let cellAIndex = 0; cellAIndex < this.cells.length; cellAIndex++) {
                let cellA = this.cells[cellAIndex];
                if (!cellA) continue;

                for (let cellBIndex = cellAIndex + 1; cellBIndex < this.cells.length; cellBIndex++) {
                    let cellB = this.cells[cellBIndex];
                    if (!cellB) continue;

                    let colliding = sat.testCircleCircle(cellA.toCircle(), cellB.toCircle());
                    if (colliding) {
                        collidingCellIndexes.add(cellAIndex);
                        collidingCellIndexes.add(cellBIndex);
                    }
                }
            }

            // Update separation status and timers for each cell
            const now = Date.now();
            for (let i = 0; i < this.cells.length; i++) {
                let cell = this.cells[i];
                if (!cell) continue;

                // If this cell is not colliding with anyone and hasn't separated yet
                if (!collidingCellIndexes.has(i) && !cell.hasSeparated) {
                    // Mark as separated and start merge timer
                    cell.hasSeparated = true;
                    cell.timeToMerge = now + this.config.mergeTimer;
                }

                // Update canMerge status based on timer
                if (cell.hasSeparated && cell.timeToMerge !== null && now >= cell.timeToMerge) {
                    cell.canMerge = true;
                }
            }

            // Merge or push away cells based on their individual merge status
            this.enumerateCollidingCells((cells, cellAIndex, cellBIndex) => {
                let cellA = cells[cellAIndex];
                let cellB = cells[cellBIndex];

                // Only merge if BOTH cells are allowed to merge
                if (cellA.canMerge && cellB.canMerge) {
                    cellA.addMass(cellB.mass);
                    // Reset merge state for the merged cell
                    cellA.canMerge = true;
                    cellA.hasSeparated = true;
                    cellA.timeToMerge = null;
                    cells[cellBIndex] = null;
                } else {
                    // Push them apart
                    let vector = new sat.Vector(cellB.x - cellA.x, cellB.y - cellA.y);
                    vector = vector.normalize().scale(this.config.pushingAwaySpeed, this.config.pushingAwaySpeed);
                    if (vector.len() == 0) {
                        vector = new sat.Vector(0, 1);
                    }

                    cellA.x -= vector.x;
                    cellA.y -= vector.y;
                    cellB.x += vector.x;
                    cellB.y += vector.y;
                }
            });

            this.cells = util.removeNulls(this.cells);
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
