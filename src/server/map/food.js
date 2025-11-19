"use strict";

const util = require('../lib/util');
const { v4: uuidv4 } = require('uuid');
const {getPosition} = require("../lib/entityUtils");

// Food tier system: defines 5 tiers with different nutritional values, display sizes, and colors
const FOOD_TIERS = [
    { multiplier: 1,  displayRadius: 10, hue: 200,   name: 'x1'  },
    { multiplier: 3,  displayRadius: 13, hue: 120,  name: 'x3'  },
    { multiplier: 9,  displayRadius: 16, hue: 45, name: 'x9'  },
    { multiplier: 27, displayRadius: 19, hue: 0, name: 'x27' },
    { multiplier: 81, displayRadius: 23, hue: 270, name: 'x81' }
];

// Randomly select a food tier
function getRandomTier() {
    return FOOD_TIERS[Math.floor(Math.random() * FOOD_TIERS.length)];
}

class Food {
    constructor(position, radius) {
        this.id = uuidv4();
        this.x = position.x;
        this.y = position.y;

        // Select a random tier for this food
        this.tier = getRandomTier();

        // Use the tier's fixed display radius
        this.radius = this.tier.displayRadius;

        // Mass is based on the tier's multiplier (base mass ~2-3)
        this.mass = (Math.random() + 2) * this.tier.multiplier;

        // Use the tier's constant color for easy identification
        this.hue = this.tier.hue;
    }
}

exports.FoodManager = class {
    constructor(foodMass, foodUniformDisposition) {
        this.data = [];
        this.foodMass = foodMass;
        this.foodUniformDisposition = foodUniformDisposition;
    }

    addNew(number) {
        const radius = util.massToRadius(this.foodMass);
        while (number--) {
            const position = getPosition(this.foodUniformDisposition, radius, this.data)
            this.data.push(new Food(position, radius));
        }
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
