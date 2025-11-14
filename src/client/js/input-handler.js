/**
 * Input Handler
 * Manages all user input: keyboard, mouse, and touch controls
 */

var global = require("./global");
var gameState = require("./game-state");
var socketManager = require("./socket-manager");
var uiManager = require("./ui-manager");

// Key codes
const KEY_CODES = {
    ENTER: 13,
    SPACE: 32,
    W: 87,
    Q: 81,
    ESC: 27
};

// Touch state for mobile
var touchState = {
    active: false,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0
};

/**
 * Initialize all input handlers
 */
exports.init = function() {
    initKeyboardControls();
    initMouseControls();
    if (global.mobile) {
        initTouchControls();
    }
};

/**
 * Initialize keyboard controls
 */
function initKeyboardControls() {
    // Main game controls
    window.addEventListener('keydown', function(event) {
        if (!global.gameStart) return;

        var socket = socketManager.getSocket();
        if (!socket) return;

        switch (event.keyCode) {
            case KEY_CODES.SPACE:
                // Split
                event.preventDefault();
                socket.emit('1');
                uiManager.playSound('split_cell', 0.5);
                break;

            case KEY_CODES.W:
                // Eject mass
                event.preventDefault();
                socket.emit('2');
                uiManager.playSound('eject_mass_sound', 0.3);
                break;

            case KEY_CODES.Q:
                // Q key for spectate mode switching
                if (global.gameStart && global.playerType === 'spectator') {
                    socket.emit('3');
                }
                break;

            case KEY_CODES.ESC:
                // Exit game
                event.preventDefault();
                if (global.gameStart) {
                    uiManager.playSound('escape_sound', 0.5);
                    exitGame();
                }
                break;
        }
    });

    // Chat/command key handler (handled in chat-client.js)
    window.addEventListener('keypress', function(event) {
        if (event.keyCode === KEY_CODES.ENTER && !global.gameStart) {
            // Start game on Enter from landing page
            if (document.getElementById("landingView").style.display !== "none") {
                var playerNameInput = document.getElementById("playerNameInput");
                playerNameInput.value = uiManager.generateGuestName();
                window.startGame("player");
            }
        }
    });
}

/**
 * Initialize mouse controls
 */
function initMouseControls() {
    var canvas = document.getElementById('cvs');
    if (!canvas) return;

    // Mouse move handler
    canvas.addEventListener('mousemove', function(event) {
        if (!global.gameStart) return;

        global.target.x = event.clientX - global.screen.width / 2;
        global.target.y = event.clientY - global.screen.height / 2;
        gameState.setTarget(global.target.x, global.target.y);
    });

    // Mouse leave handler for continuity setting
    if (global.continuity) {
        canvas.addEventListener('mouseleave', function() {
            // Continue in the same direction
        });
    }

    // Split on mouse click (alternative to spacebar)
    canvas.addEventListener('mousedown', function(event) {
        if (global.gameStart && event.button === 0) { // Left click
            if (event.shiftKey) {
                // Shift+click to eject mass
                var socket = socketManager.getSocket();
                if (socket) {
                    socket.emit('2');
                    uiManager.playSound('eject_mass_sound', 0.3);
                }
            }
        }
    });
}

/**
 * Initialize touch controls for mobile
 */
function initTouchControls() {
    var canvas = document.getElementById('cvs');
    if (!canvas) return;

    // Touch start
    canvas.addEventListener('touchstart', function(e) {
        if (!global.gameStart) return;

        e.preventDefault();
        var touch = e.touches[0];
        touchState.active = true;
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;

        // Update target position
        global.target.x = touchState.startX - global.screen.width / 2;
        global.target.y = touchState.startY - global.screen.height / 2;
        gameState.setTarget(global.target.x, global.target.y);
    });

    // Touch move
    canvas.addEventListener('touchmove', function(e) {
        if (!global.gameStart || !touchState.active) return;

        e.preventDefault();
        var touch = e.touches[0];
        touchState.moveX = touch.clientX;
        touchState.moveY = touch.clientY;

        // Update target position
        global.target.x = touchState.moveX - global.screen.width / 2;
        global.target.y = touchState.moveY - global.screen.height / 2;
        gameState.setTarget(global.target.x, global.target.y);
    });

    // Touch end
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        touchState.active = false;
    });

    // Mobile button handlers
    setupMobileButtons();
}

/**
 * Setup mobile control buttons
 */
function setupMobileButtons() {
    // Split button
    var splitBtn = document.getElementById('split');
    if (splitBtn) {
        splitBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (global.gameStart) {
                var socket = socketManager.getSocket();
                if (socket) {
                    socket.emit('1');
                    uiManager.playSound('split_cell', 0.5);
                }
            }
        });
    }

    // Feed button
    var feedBtn = document.getElementById('feed');
    if (feedBtn) {
        feedBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (global.gameStart) {
                var socket = socketManager.getSocket();
                if (socket) {
                    socket.emit('2');
                    uiManager.playSound('eject_mass_sound', 0.3);
                }
            }
        });
    }

    // Exit button
    var exitBtn = document.getElementById('exit');
    if (exitBtn) {
        exitBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (global.gameStart) {
                uiManager.playSound('escape_sound', 0.5);
                exitGame();
            }
        });
    }
}

/**
 * Exit the current game
 */
function exitGame() {
    if (!global.gameStart) return;

    // Play end of game sound
    uiManager.playSound('end_of_game_sound', 0.7);

    // Save score
    var player = gameState.getPlayer();
    if (player && player.score !== undefined) {
        uiManager.saveLastScore(player.score);
    }

    // Clear game state
    gameState.clearState();

    // Stop background music
    uiManager.stopBackgroundMusic();

    // Disconnect socket
    socketManager.disconnect();

    // Cancel animation loop
    if (global.animLoopHandle) {
        window.cancelAnimationFrame(global.animLoopHandle);
        global.animLoopHandle = undefined;
    }

    // Show landing page
    uiManager.showLandingView();

    // Display last score
    uiManager.displayLastScore();
}

// Export exitGame for external use
exports.exitGame = exitGame;

/**
 * Send movement update to server
 */
exports.sendMovement = function() {
    if (!global.gameStart) return;

    var socket = socketManager.getSocket();
    if (!socket) return;

    var target = gameState.getTarget();
    socket.emit('0', target);
};

/**
 * Check if any input is active
 */
exports.isInputActive = function() {
    return touchState.active || global.target.x !== 0 || global.target.y !== 0;
};