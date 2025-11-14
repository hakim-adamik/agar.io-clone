/**
 * Score Manager
 * Handles score display, currency formatting, and score tracking
 */

var global = require("./global");

// Score display configuration
const SCORE_CONFIG = {
    updateInterval: 100, // Update score display every 100ms
    animationDuration: 500, // Score animation duration in ms
    currencySymbol: "$"
};

// Current displayed score (for animation)
var displayedScore = 0;
var targetScore = 0;
var scoreUpdateTimer = null;

/**
 * Format score as currency
 */
exports.formatAsCurrency = function(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return `${SCORE_CONFIG.currencySymbol}0.00`;
    }
    return `${SCORE_CONFIG.currencySymbol}${value.toFixed(2)}`;
};

/**
 * Update the player's score display with animation
 */
exports.updateScoreDisplay = function(newScore) {
    targetScore = newScore || 0;

    // Clear existing timer if any
    if (scoreUpdateTimer) {
        clearInterval(scoreUpdateTimer);
    }

    // Animate score change
    scoreUpdateTimer = setInterval(function() {
        var diff = targetScore - displayedScore;

        // If difference is small, just set it directly
        if (Math.abs(diff) < 0.01) {
            displayedScore = targetScore;
            updateScoreElement(displayedScore);
            clearInterval(scoreUpdateTimer);
            scoreUpdateTimer = null;
        } else {
            // Animate by moving 10% closer each frame
            displayedScore += diff * 0.1;
            updateScoreElement(displayedScore);
        }
    }, 16); // ~60 FPS
};

/**
 * Immediately set the score display without animation
 */
exports.setScoreImmediate = function(score) {
    displayedScore = score || 0;
    targetScore = displayedScore;
    updateScoreElement(displayedScore);
};

/**
 * Update the score DOM element
 */
function updateScoreElement(score) {
    var scoreEl = document.getElementById("playerScore");
    if (scoreEl) {
        var scoreValue = scoreEl.querySelector(".score-value");
        if (scoreValue) {
            scoreValue.textContent = exports.formatAsCurrency(score);

            // Add visual feedback for score changes
            if (score > displayedScore) {
                scoreValue.style.color = "#27ae60"; // Green for increase
                setTimeout(() => {
                    scoreValue.style.color = ""; // Reset after animation
                }, 500);
            } else if (score < displayedScore) {
                scoreValue.style.color = "#e74c3c"; // Red for decrease
                setTimeout(() => {
                    scoreValue.style.color = ""; // Reset after animation
                }, 500);
            }
        }
    }
}

/**
 * Calculate score from mass
 */
exports.calculateScore = function(mass) {
    // Simple conversion: 1 mass = $0.01
    return (mass || 0) * 0.01;
};

/**
 * Save score to localStorage
 */
exports.saveScore = function(score) {
    if (score !== undefined) {
        localStorage.setItem("lastScore", score.toString());
    }
};

/**
 * Get last saved score
 */
exports.getLastScore = function() {
    var scoreStr = localStorage.getItem("lastScore");
    if (scoreStr) {
        return parseFloat(scoreStr);
    }
    return 0;
};

/**
 * Clear saved score
 */
exports.clearSavedScore = function() {
    localStorage.removeItem("lastScore");
};

/**
 * Format score for leaderboard display
 */
exports.formatLeaderboardScore = function(score) {
    if (score >= 1000000) {
        return `${SCORE_CONFIG.currencySymbol}${(score / 1000000).toFixed(2)}M`;
    } else if (score >= 1000) {
        return `${SCORE_CONFIG.currencySymbol}${(score / 1000).toFixed(1)}K`;
    } else {
        return exports.formatAsCurrency(score);
    }
};

/**
 * Initialize score display
 */
exports.initScoreDisplay = function() {
    var scoreEl = document.getElementById("playerScore");
    if (scoreEl && !scoreEl.querySelector(".score-value")) {
        scoreEl.innerHTML = '<div class="score-value">$0.00</div>';
    }
};