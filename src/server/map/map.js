"use strict";

const {isVisibleEntity} = require("../lib/entityUtils");

exports.foodUtils = require('./food');
exports.virusUtils = require('./virus');
exports.massFoodUtils = require('./massFood');
exports.playerUtils = require('./player');

exports.Map = class {
    constructor(config) {
        this.food = new exports.foodUtils.FoodManager(config.foodMass, config.foodUniformDisposition);
        this.viruses = new exports.virusUtils.VirusManager(config.virus);
        this.massFood = new exports.massFoodUtils.MassFoodManager();
        this.players = new exports.playerUtils.PlayerManager();

        // Initialize food reserve with gameMass
        this.foodReserve = config.gameMass;

        // Track last food generation time for fixed frequency generation
        this.lastFoodGenerationTime = Date.now();
        this.foodGenerationInterval = config.foodGenerationInterval; // Generate food at fixed intervals
    }

    balanceMass(foodMass, gameMass, maxVirus) {
        // With the reserve system, food count is naturally regulated by available reserve
        // Generate food on a fixed 2-second frequency
        const now = Date.now();
        const timeSinceLastGeneration = now - this.lastFoodGenerationTime;

        if (timeSinceLastGeneration >= this.foodGenerationInterval && this.foodReserve > 0) {
            // Estimate average food mass to determine how many we can afford
            // Average tier multiplier: (1+3+9+27+81)/5 = 24.2
            // Average food mass: 2.5 * 24.2 = 60.5
            const avgFoodMass = 60.5;

            // Calculate how many food items we can afford with current reserve
            const affordableCount = Math.floor(this.foodReserve / avgFoodMass);

            // Generate in batches (50 at a time) for performance
            const batchSize = 50;
            const actualCountToGenerate = Math.min(affordableCount, batchSize);

            if (actualCountToGenerate > 0) {
                const actualMassGenerated = this.food.addNew(actualCountToGenerate);
                this.foodReserve -= actualMassGenerated;

                // If we went negative (due to random variance), clamp to 0
                if (this.foodReserve < 0) {
                    console.warn(`[MAP] Food reserve went negative: ${this.foodReserve}. Clamping to 0.`);
                    this.foodReserve = 0;
                }

                // Update last generation time
                this.lastFoodGenerationTime = now;
            }
        }
        // Note: Food is added back to reserve immediately when eaten (in arena.js)

        const virusesToAdd = maxVirus - this.viruses.data.length;
        if (virusesToAdd > 0) {
            this.viruses.addNew(virusesToAdd);
        }
    }

    enumerateWhatPlayersSee(callback) {
        for (let currentPlayer of this.players.data) {
            var visibleFood = this.food.data.filter(entity => isVisibleEntity(entity, currentPlayer, false));
            var visibleViruses = this.viruses.data.filter(entity => isVisibleEntity(entity, currentPlayer));
            var visibleMass = this.massFood.data.filter(entity => isVisibleEntity(entity, currentPlayer));

            const extractData = (player) => {
                return {
                    x: player.x,
                    y: player.y,
                    cells: player.cells.map(cell => ({
                        x: cell.x,
                        y: cell.y,
                        mass: cell.mass,
                        radius: cell.radius,
                        score: player.getCellScore(cell) // Calculate score dynamically
                    })),
                    massTotal: Math.round(player.massTotal),
                    hue: player.hue,
                    id: player.id,
                    name: player.name
                };
            }

            var visiblePlayers = [];
            for (let player of this.players.data) {
                for (let cell of player.cells) {
                    if (isVisibleEntity(cell, currentPlayer)) {
                        visiblePlayers.push(extractData(player));
                        break;
                    }
                }
            }

            callback(extractData(currentPlayer), visiblePlayers, visibleFood, visibleMass, visibleViruses);
        }
    }
}
