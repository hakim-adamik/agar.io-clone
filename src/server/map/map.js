"use strict";

const {isVisibleEntity} = require("../lib/entityUtils");

exports.foodUtils = require('./food');
exports.virusUtils = require('./virus');
exports.massFoodUtils = require('./massFood');
exports.playerUtils = require('./player');

exports.Map = class {
    constructor(config) {
        this.food = new exports.foodUtils.FoodManager(config.massUnit, config.foodUniformDisposition);
        this.viruses = new exports.virusUtils.VirusManager(config.virus);
        this.massFood = new exports.massFoodUtils.MassFoodManager();
        this.players = new exports.playerUtils.PlayerManager();

        // Initialize food reserve at 0 - filled only by player stakes and cell decay
        this.foodReserve = 0;

        // Track last food generation time for fixed frequency generation
        this.lastFoodGenerationTime = Date.now();
        this.foodGenerationInterval = config.foodGenerationInterval; // Generate food at fixed intervals
        this.foodGenerationBatchMass = config.foodGenerationBatchMass; // Max mass per batch
        this.foodTarget = config.foodTarget; // Target number of food items on map
    }

    balanceMass(massUnit, maxVirus) {
        // With the reserve system, food count is naturally regulated by available reserve
        // Generate food on a fixed 2-second frequency
        const now = Date.now();
        const timeSinceLastGeneration = now - this.lastFoodGenerationTime;

        if (timeSinceLastGeneration >= this.foodGenerationInterval && this.foodReserve > 0) {
            // Generate food in mass batches (not count-based)
            // Mass to generate is the minimum of: available reserve or configured batch size
            const massToGenerate = Math.min(this.foodReserve, this.foodGenerationBatchMass);

            if (massToGenerate > 0) {
                // Determine tier order based on current food count vs target
                const currentFoodCount = this.food.data.length;
                const useLargestFirst = currentFoodCount >= this.foodTarget;

                // addNew now takes mass amount and tier order preference
                const actualMassGenerated = this.food.addNew(massToGenerate, useLargestFirst);
                this.foodReserve -= actualMassGenerated;

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
