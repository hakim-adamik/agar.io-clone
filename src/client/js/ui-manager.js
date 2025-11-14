/**
 * UI Manager
 * Handles all UI interactions, modals, and view transitions
 */

var global = require("./global");

/**
 * Transition from landing page to game view
 */
exports.showGameView = function() {
    var landingView = document.getElementById("landingView");
    var gameView = document.getElementById("gameView");

    if (landingView && gameView) {
        // Completely hide the landing view
        landingView.style.display = "none";
        gameView.style.display = "block";
        setTimeout(function() {
            document.getElementById("gameAreaWrapper").style.opacity = 1;
        }, 50);
    } else {
        // Fallback for old flow
        document.getElementById("startMenuWrapper").style.maxHeight = "0px";
        document.getElementById("gameAreaWrapper").style.opacity = 1;
    }

    // Show the player score display when game starts
    var playerScoreEl = document.getElementById("playerScore");
    if (playerScoreEl) {
        playerScoreEl.style.display = "block";
    }
};

/**
 * Transition from game view to landing page
 */
exports.showLandingView = function() {
    var landingView = document.getElementById("landingView");
    var gameView = document.getElementById("gameView");

    if (landingView && gameView) {
        // Hide game view
        gameView.style.display = "none";
        document.getElementById("gameAreaWrapper").style.opacity = 0;

        // Hide player score display
        var playerScoreEl = document.getElementById("playerScore");
        if (playerScoreEl) {
            playerScoreEl.style.display = "none";
        }

        // Show landing view
        landingView.style.display = "block";
    } else {
        // Fallback to old menu if landing page not found
        document.getElementById("gameAreaWrapper").style.opacity = 0;
        document.getElementById("startMenuWrapper").style.maxHeight = "1000px";
    }
};

/**
 * Display last score with optional death styling
 */
exports.displayLastScore = function(isDeath = false) {
    try {
        const lastScoreStr = localStorage.getItem("lastScore");
        const lastScoreBox = document.getElementById("lastScoreBox");

        if (lastScoreBox && lastScoreStr) {
            const lastScore = parseFloat(lastScoreStr);
            const lastScoreValue = document.getElementById("lastScoreValue");

            if (lastScoreValue) {
                if (isDeath) {
                    // Death: Show encouraging message without amount
                    lastScoreValue.style.display = "none"; // Hide the score value

                    const lastScoreLabel = lastScoreBox.querySelector('span:first-child');
                    if (lastScoreLabel) {
                        lastScoreLabel.textContent = "You lost ! Jump back in and prove them wrong !";
                        lastScoreLabel.style.color = "#ff4757"; // Red for loss
                    }
                } else {
                    // Normal display
                    if (lastScore > 0) {
                        lastScoreValue.textContent = `+$${lastScore.toFixed(2)}`; // Plus sign for positive
                        lastScoreValue.style.color = "#27ae60"; // Green for profit
                    } else if (lastScore < 0) {
                        lastScoreValue.textContent = `-$${Math.abs(lastScore).toFixed(2)}`; // Already has negative
                        lastScoreValue.style.color = "#ff4757"; // Red for loss
                    } else {
                        lastScoreValue.textContent = "$0.00";
                        lastScoreValue.style.color = "";
                    }

                    lastScoreValue.style.display = "inline-block"; // Show the score value

                    // Reset label
                    const lastScoreLabel = lastScoreBox.querySelector('span:first-child');
                    if (lastScoreLabel) {
                        lastScoreLabel.textContent = "Last Score";
                        lastScoreLabel.style.color = "";
                    }

                    lastScoreBox.style.display = "flex";
                }
            } else {
                lastScoreBox.style.display = "none";
            }
        }
    } catch (e) {
        console.log("Could not display last score:", e);
    }
};

/**
 * Save the last score to localStorage
 */
exports.saveLastScore = function(score) {
    if (score !== undefined) {
        localStorage.setItem("lastScore", score.toString());
    }
};

/**
 * Setup leaderboard toggle for mobile
 */
exports.setupLeaderboardToggle = function() {
    var statusElem = document.getElementById("status");
    if (statusElem && global.mobile) {
        statusElem.addEventListener("click", function() {
            var isVisible = statusElem.style.opacity === "1";
            statusElem.style.opacity = isVisible ? "0.7" : "1";
            statusElem.style.maxHeight = isVisible ? "150px" : "500px";
        });
    }
};

/**
 * Generate a random guest name
 */
exports.generateGuestName = function() {
    return `Guest_${Math.floor(Math.random() * 10000)}`;
};

/**
 * Set up background music
 */
exports.setupBackgroundMusic = function() {
    try {
        const backgroundMusic = document.getElementById('background_music');
        if (backgroundMusic && global.musicEnabled) {
            backgroundMusic.volume = 0.1; // Background music at 10% volume
            backgroundMusic.loop = true; // Ensure looping is enabled

            // Remove any existing event listeners to prevent duplicates
            backgroundMusic.removeEventListener('ended', window.musicLoopHandler);

            // Create named handler for seamless looping
            window.musicLoopHandler = function() {
                if (global.musicEnabled && global.gameStart) {
                    this.currentTime = 0;
                    this.play().catch(console.log);
                }
            };

            // Add seamless looping event listener to prevent gaps
            backgroundMusic.addEventListener('ended', window.musicLoopHandler);
            backgroundMusic.play().catch(console.log);
        }
    } catch (e) {
        console.log('Background music not available:', e);
    }
};

/**
 * Stop background music
 */
exports.stopBackgroundMusic = function() {
    try {
        const backgroundMusic = document.getElementById('background_music');
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    } catch (e) {
        console.log('Error stopping background music:', e);
    }
};

/**
 * Play sound effect
 */
exports.playSound = function(soundId, volume = 0.5) {
    if (global.soundEnabled) {
        try {
            const sound = document.getElementById(soundId);
            if (sound) {
                sound.volume = volume;
                sound.currentTime = 0;
                sound.play().catch(function(e) {
                    console.log(`${soundId} playback failed:`, e);
                });
            }
        } catch (e) {
            console.log(`${soundId} not available:`, e);
        }
    }
};

/**
 * Close modal
 */
exports.closeModal = function(modal) {
    if (modal) {
        modal.style.display = "none";
    }
};