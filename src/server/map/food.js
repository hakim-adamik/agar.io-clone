"use strict";

const util = require('../lib/util');
const { v4: uuidv4 } = require('uuid');
const {getPosition} = require("../lib/entityUtils");

// Food tier system: defines 5 tiers with different nutritional values, display sizes, and colors
// Sorted from smallest to largest for deterministic allocation
// Note: tier.mass values are base multipliers - actual mass = tier.mass * massUnit (from config)
const FOOD_TIERS = [
    { mass: 1,  displayRadius: 10, hue: 200, name: 'x1'  },  // Tier 1: base
    { mass: 3,  displayRadius: 13, hue: 120, name: 'x3'  },  // Tier 2: 3x nutrition
    { mass: 9,  displayRadius: 16, hue: 45,  name: 'x9'  },  // Tier 3: 9x nutrition
    { mass: 27, displayRadius: 19, hue: 0,   name: 'x27' },  // Tier 4: 27x nutrition
    { mass: 81, displayRadius: 23, hue: 270, name: 'x81' }   // Tier 5: 81x nutrition
];

class Food {
    constructor(position, tier) {
        this.id = uuidv4();
        this.x = position.x;
        this.y = position.y;

        // Use the provided tier (selected before positioning)
        this.tier = tier;

        // Use the tier's fixed display radius
        this.radius = this.tier.displayRadius;

        // Mass is determined by tier.mass (no randomness)
        // Access via food.tier.mass

        // Use the tier's constant color for easy identification
        this.hue = this.tier.hue;
    }
}

exports.FoodManager = class {
    constructor(massUnit, foodUniformDisposition) {
        this.data = [];
        this.massUnit = massUnit;
        this.foodUniformDisposition = foodUniformDisposition;
    }

    addNew(massToCreate, useLargestFirst = false) {
        let totalMassGenerated = 0;
        let massRemaining = massToCreate;

        // Choose tier order based on current food count vs target
        // Below target: smallest first (creates more items)
        // Above target: largest first (creates fewer, more valuable items)
        const tiers = useLargestFirst ? [...FOOD_TIERS].reverse() : FOOD_TIERS;

        // Fill mass deterministically with chosen tier order
        for (let tier of tiers) {
            // Calculate actual mass per food (tier.mass * massUnit)
            const actualMassPerFood = tier.mass * this.massUnit;

            // Calculate how many foods of this tier we can create with remaining mass
            const foodsOfThisTier = Math.floor(massRemaining / actualMassPerFood);

            // Create each food of this tier
            for (let i = 0; i < foodsOfThisTier; i++) {
                const radius = tier.displayRadius;

                // Get position using the actual radius of this food tier
                const position = getPosition(this.foodUniformDisposition, radius, this.data);

                // Create food with this tier
                const newFood = new Food(position, tier);
                this.data.push(newFood);

                // Track mass created (deterministic: tier.mass * massUnit)
                totalMassGenerated += actualMassPerFood;
                massRemaining -= actualMassPerFood;

                // Safety check: if we've used up all the mass, stop
                if (massRemaining <= 0) {
                    return totalMassGenerated;
                }
            }
        }

        return totalMassGenerated;
    }

    removeExcess(number) {
        while (number-- && this.data.length) {
            this.data.pop();
        }
    }

    delete(foodsToDelete) {
        if (foodsToDelete.length > 0) {
            this.data = util.removeIndexes(this.data, foodsToDelete);
        }
    }
};
