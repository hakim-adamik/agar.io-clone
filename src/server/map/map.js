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
    }

    balanceMass(foodMass, gameMass, maxFood, maxVirus) {
        // With the reserve system, we generate food one-by-one until:
        // 1. We reach maxFood count, OR
        // 2. We run out of reserve mass
        const currentFoodCount = this.food.data.length;
        const foodToGenerate = maxFood - currentFoodCount;

        if (foodToGenerate > 0 && this.foodReserve > 0) {
            // Estimate average food mass to determine how many we can afford
            // Average tier multiplier: (1+3+9+27+81)/5 = 24.2
            // Average food mass: 2.5 * 24.2 = 60.5
            const avgFoodMass = 60.5;

            // Calculate how many food items we can afford with current reserve
            const affordableCount = Math.floor(this.foodReserve / avgFoodMass);

            // Generate the minimum of: what we need, what we can afford
            const actualCountToGenerate = Math.min(foodToGenerate, affordableCount);

            if (actualCountToGenerate > 0) {
                const actualMassGenerated = this.food.addNew(actualCountToGenerate);
                this.foodReserve -= actualMassGenerated;

                // If we went negative (due to random variance), clamp to 0
                if (this.foodReserve < 0) {
                    console.warn(`[MAP] Food reserve went negative: ${this.foodReserve}. Clamping to 0.`);
                    this.foodReserve = 0;
                }
            }
        }
        // Note: We don't remove excess food anymore - food is only removed when eaten

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
