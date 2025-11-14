/**
 * Game State Manager
 * Manages all game state variables and provides methods to update them
 */

var global = require("./global");

// Game entities
var player = null;
var users = [];
var foods = [];
var viruses = [];
var fireFood = [];
var leaderboard = [];

// Movement target
var target = {
    x: global.playerX,
    y: global.playerY
};

// Game configuration
var playerConfig = {
    border: 6,
    textColor: "#FFFFFF",
    textBorder: "#000000",
    textBorderSize: 3,
    defaultSize: 30
};

// Export getters
exports.getPlayer = function() { return player; };
exports.getUsers = function() { return users; };
exports.getFoods = function() { return foods; };
exports.getViruses = function() { return viruses; };
exports.getFireFood = function() { return fireFood; };
exports.getLeaderboard = function() { return leaderboard; };
exports.getTarget = function() { return target; };
exports.getPlayerConfig = function() { return playerConfig; };

// Export setters
exports.setPlayer = function(p) { player = p; };
exports.setUsers = function(u) { users = u; };
exports.setFoods = function(f) { foods = f; };
exports.setViruses = function(v) { viruses = v; };
exports.setFireFood = function(f) { fireFood = f; };
exports.setLeaderboard = function(l) { leaderboard = l; };
exports.setTarget = function(x, y) {
    target.x = x;
    target.y = y;
};

/**
 * Clear all game state (used on death or disconnect)
 */
exports.clearState = function() {
    player = null;
    users = [];
    foods = [];
    viruses = [];
    fireFood = [];
    leaderboard = [];
    target = {
        x: global.playerX,
        y: global.playerY
    };
    global.gameStart = false;
};

/**
 * Update target position based on mouse/touch input
 */
exports.updateTarget = function(x, y) {
    target.x = x;
    target.y = y;
};

/**
 * Check if player exists
 */
exports.isPlayerAlive = function() {
    return player !== null && player !== undefined;
};

/**
 * Get player score
 */
exports.getPlayerScore = function() {
    if (player && player.score !== undefined) {
        return player.score;
    }
    return 0;
};

/**
 * Get player mass
 */
exports.getPlayerMass = function() {
    if (player && player.massTotal !== undefined) {
        return player.massTotal;
    }
    return 0;
};

/**
 * Update leaderboard
 */
exports.updateLeaderboard = function(newLeaderboard) {
    leaderboard = newLeaderboard || [];

    // Update leaderboard display if it exists
    var status = document.getElementById("status");
    if (status) {
        var leaderboardHtml = '<span class="title">Leaderboard</span>';
        for (var i = 0; i < leaderboard.length; i++) {
            var name = leaderboard[i].name || "Anonymous";
            leaderboardHtml += '<br />';
            if (player && leaderboard[i].id === player.id) {
                name = player.name;
                leaderboardHtml += '<span class="me">' + (i + 1) + '. ' + name + '</span>';
            } else {
                leaderboardHtml += (i + 1) + '. ' + name;
            }
        }
        status.innerHTML = leaderboardHtml;
    }
};

/**
 * Update player position for interpolation
 */
exports.updatePlayerPosition = function(serverPos) {
    if (player && serverPos) {
        // Smooth interpolation
        player.x = serverPos.x;
        player.y = serverPos.y;
        player.hue = serverPos.hue;
        player.massTotal = serverPos.massTotal;
        player.cells = serverPos.cells;
    }
};