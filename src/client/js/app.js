var io = require("socket.io-client");
var render = require("./render");
var Canvas = require("./canvas");
var global = require("./global");
var PredictionSystem = require("./prediction");
var CellAnimations = require("./cell-animations");

var playerNameInput = document.getElementById("playerNameInput");
var socket;

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

// Detect mobile devices and add class to body for CSS targeting
// This ensures mobile styles work in both portrait and landscape
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    navigator.maxTouchPoints > 0) {
    global.mobile = true;
    document.body.classList.add('mobile-device');
    // Mobile device detected - UI optimized for touch
} else {
    // Desktop device detected - UI optimized for mouse
}

function generateGuestName() {
    return "Guest_" + Math.floor(Math.random() * 10000);
}

// Global function for seamless game start from landing page
window.startSeamlessGame = function () {
    var playerNameInput = document.getElementById("playerNameInput");
    if (!playerNameInput.value) {
        playerNameInput.value = generateGuestName();
    }

    // Apply default game settings from config
    applyDefaultGameSettings();

    startGame("player");
};

// Apply default game settings based on configuration
function applyDefaultGameSettings() {
    // Try to load user preferences from server if authenticated
    var privyUser = JSON.parse(localStorage.getItem("privy_user") || "{}");
    if (privyUser && privyUser.dbUserId) {
        // Loading preferences for user
        loadUserPreferences(privyUser.dbUserId);
    } else {
        // Fall back to default settings if not authenticated
        applyConfigDefaults();
    }
}

// Load user preferences from server
function loadUserPreferences(userId) {
    return fetch("/api/user/" + userId + "/preferences")
        .then(function (response) {
            if (!response.ok) throw new Error("Failed to load preferences");
            return response.json();
        })
        .then(function(prefs) {
            applyUserPreferences(prefs);
        })
        .catch(function(error) {
            console.warn("Failed to load user preferences, using defaults:", error);
            applyConfigDefaults();
        });
}

// Apply user preferences from server
function applyUserPreferences(prefs) {
    // Applying user preferences

    var DARK = "#111111";
    var LIGHT = "#f2fbff";
    var LINEDARK = "#ffffff";
    var LINELIGHT = "#000000";

    // Apply dark mode
    if (prefs.darkMode !== undefined) {
        if (prefs.darkMode === true) {
            global.backgroundColor = DARK;
            global.lineColor = LINEDARK;
        } else {
            global.backgroundColor = LIGHT;
            global.lineColor = LINELIGHT;
        }
    }

    // Apply show mass
    if (prefs.showMass !== undefined) {
        global.toggleMassState = prefs.showMass === true ? 1 : 0;
    }

    // Apply show border
    if (prefs.showBorder !== undefined) {
        global.borderDraw = prefs.showBorder === true;
    }

    // Apply continuity
    if (prefs.continuity !== undefined) {
        global.continuity = prefs.continuity === true;
    }

    // Apply show FPS
    if (prefs.showFps !== undefined) {
        global.showFpsCounter = prefs.showFps === true;
    }

    // Apply round food
    if (prefs.roundFood !== undefined) {
        global.foodSides = prefs.roundFood === true ? 10 : 5;
    }

    // Apply show grid
    if (prefs.showGrid !== undefined) {
        global.showGrid = prefs.showGrid === true;
    }

    // Apply sound enabled
    if (prefs.soundEnabled !== undefined) {
        global.soundEnabled = prefs.soundEnabled === true;
    }

    // Apply music enabled
    if (prefs.musicEnabled !== undefined) {
        global.musicEnabled = prefs.musicEnabled === true;
    }

    // Sync checkbox states
    syncSettingsCheckboxes();
}

// Apply default settings from config
function applyConfigDefaults(settings) {
    var defaults = window.DEFAULT_PREFERENCES || {};

    var DARK = "#111111";
    var LIGHT = "#f2fbff";
    var LINEDARK = "#ffffff";
    var LINELIGHT = "#000000";

    // Apply each default setting if defined
    if (defaults.darkMode !== undefined) {
        if (defaults.darkMode) {
            global.backgroundColor = DARK;
            global.lineColor = LINEDARK;
        } else {
            global.backgroundColor = LIGHT;
            global.lineColor = LINELIGHT;
        }
    }

    if (defaults.showMass !== undefined) {
        global.toggleMassState = defaults.showMass ? 1 : 0;
    }

    if (defaults.showBorder !== undefined) {
        global.borderDraw = defaults.showBorder;
    }

    if (defaults.continuity !== undefined) {
        global.continuity = defaults.continuity;
    }

    if (defaults.showFps !== undefined) {
        global.showFpsCounter = defaults.showFps;
    }

    if (defaults.soundEnabled !== undefined) {
        global.soundEnabled = defaults.soundEnabled;
    }

    if (defaults.musicEnabled !== undefined) {
        global.musicEnabled = defaults.musicEnabled;
    }

    // Sync checkbox states
    syncSettingsCheckboxes();
}

// Sync all settings checkboxes with current global state
function syncSettingsCheckboxes() {
    var checkboxSync = [
        {
            ids: ["darkMode", "darkModeGame"],
            value: global.backgroundColor === "#111111",
        },
        {
            ids: ["showMass", "showMassGame"],
            value: global.toggleMassState === 1,
        },
        { ids: ["visBord", "visBordGame"], value: global.borderDraw },
        { ids: ["continuity", "continuityGame"], value: global.continuity },
        { ids: ["showFps", "showFpsGame"], value: global.showFpsCounter },
    ];

    checkboxSync.forEach(function (sync) {
        sync.ids.forEach(function (id) {
            var element = document.getElementById(id);
            if (element) {
                element.checked = sync.value;
            }
        });
    });
}

function startGame(type) {
    // Auto-generate guest name if empty
    if (!playerNameInput.value) {
        playerNameInput.value = generateGuestName();
    }

    global.playerName = playerNameInput.value
        .replace(/(<([^>]+)>)/gi, "")
        .substring(0, 25);
    global.playerType = type;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;


    // Function to set up seamless background music (made global for socket events)
    window.setupBackgroundMusic = function() {
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

                // Don't play if in waiting room
                if (!window.inWaitingRoom) {
                    backgroundMusic.play().catch(console.log);
                }
            }
        } catch (e) {
            console.log('Background music not available:', e);
        }
    }

    // Function to continue game start after preferences are loaded
    function continueGameStart() {
    // Seamless transition from landing to game
    var landingView = document.getElementById("landingView");
    var gameView = document.getElementById("gameView");

    if (landingView && gameView) {
        // Completely hide the landing view
        landingView.style.display = "none";
        gameView.style.display = "block";
        setTimeout(function () {
            document.getElementById("gameAreaWrapper").style.opacity = 1;
        }, 50);

            // Don't start music here - will start when game actually begins
    } else {
        // Fallback for old flow
        document.getElementById("startMenuWrapper").style.maxHeight = "0px";
        document.getElementById("gameAreaWrapper").style.opacity = 1;

            // Don't start music here - will start when game actually begins
        }

        // Show the player score display when game starts
        var playerScoreEl = document.getElementById("playerScore");
        if (playerScoreEl) {
            playerScoreEl.style.display = "block";
        }

        // ALWAYS create a new socket connection when starting the game
        // Even if socket exists, we need a fresh connection after death
        // Check current socket state

        // Clean up any existing socket first
        if (socket) {
            // Cleaning up existing socket before creating new one
            socket.disconnect();
            socket = null;
            window.canvas.socket = null;
            global.socket = null;
        }

        // Now create the new socket
        {
        // Get user data from localStorage (if authenticated)
        let userData = null;
        try {
            const privyUserStr = localStorage.getItem("privy_user");
            if (privyUserStr) {
                userData = JSON.parse(privyUserStr);
            }
        } catch (e) {
            console.error("[Socket] Failed to parse user data:", e);
        }

        // Build query params including user data
        const queryParams = {
            type: type,
            arenaId: global.arenaId || null,
            userId: userData?.dbUserId || null,
            playerName:
                playerNameInput.value ||
                userData?.username ||
                `Guest_${Math.floor(Math.random() * 10000)}`,
        };

        // Convert to query string
        const query = Object.keys(queryParams)
            .filter((key) => queryParams[key] !== null)
            .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
            .join("&");

            // Clean up any existing socket connection
            if (socket) {
                // Cleaning up previous connection
                socket.disconnect();
                socket = null;
                window.canvas.socket = null;
                global.socket = null;
            }

            // Always create new socket after cleanup (with or without delay)
            createNewSocket(query);

            function createNewSocket(queryString) {
        // Socket.io configuration optimized for real-time gaming
        socket = io({
                    query: queryString,
            // Prioritize WebSocket, fallback to polling
            transports: ['websocket', 'polling'],
            // Reconnection settings
            reconnection: true,
            reconnectionDelay: 1000,      // Start with 1s delay
            reconnectionDelayMax: 5000,   // Max 5s between attempts
            reconnectionAttempts: 10,     // Try 10 times before giving up
            // Timeouts
            timeout: 20000,               // 20s connection timeout
            // Upgrade settings
            upgrade: true,
            rememberUpgrade: true,
            // Ping/pong already configured server-side
        });
        setupSocket(socket);

                // Now that socket is created, we can emit and set it up
    if (!global.animLoopHandle) animloop();
    socket.emit("respawn");
    window.canvas.socket = socket;
    global.socket = socket;
            } // Close createNewSocket function
        } // Close socket creation block
    } // Close continueGameStart function

    // Load user preferences when starting the game
    var privyUser = JSON.parse(localStorage.getItem("privy_user") || "{}");
    if (privyUser && privyUser.dbUserId) {
        // Loading user preferences for game start
        loadUserPreferences(privyUser.dbUserId).then(continueGameStart);
    } else {
        // No authenticated user, applying default settings
        applyConfigDefaults();
        continueGameStart();
    }
} // End of startGame function

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug("Regex Test", regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

// Enhanced player score display update
var lastScore = 0;
var displayedScore = 0;
var targetScore = 0;
var scoreAnimationFrame = null;

function updatePlayerScoreDisplay(player) {
    var score = player.score || 0; // Keep as float for smooth animation
    targetScore = score;

    var scoreValueEl = document.querySelector('.score-value');

    if (scoreValueEl) {
        // Start animated counting if not already running
        if (!scoreAnimationFrame) {
            animateScore();
        }

        lastScore = score;
    }
}

function animateScore() {
    var scoreValueEl = document.querySelector('.score-value');
    if (!scoreValueEl) return;

    // Smooth animation towards target
    var diff = targetScore - displayedScore;
    var step = diff * 0.15; // Adjust speed of counting

    // Minimum step to ensure we're always moving
    if (Math.abs(diff) > 0.01) {
        displayedScore += step;

        // Add counting class for subtle animation
        scoreValueEl.classList.add('counting');
        setTimeout(() => scoreValueEl.classList.remove('counting'), 50);
            } else {
        displayedScore = targetScore;
    }

    // Format with 2 decimal places, thousand separators, and $ sign
    var formattedScore = displayedScore.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    scoreValueEl.textContent = formattedScore + '$';

    // Continue animation if needed
    if (Math.abs(targetScore - displayedScore) > 0.01) {
        scoreAnimationFrame = requestAnimationFrame(animateScore);
    } else {
        scoreAnimationFrame = null;
    }
}

// Waiting Room UI Functions
function showWaitingRoomUI(data) {
    // Hide game UI elements
    const gameCanvas = document.getElementById('canvas');
    if (gameCanvas) {
        gameCanvas.style.opacity = '0.3';
    }

    // Hide score display while in waiting room
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
        scoreElement.style.display = 'none';
    }

    // Create modal container
    let modalContainer = document.getElementById('waitingRoomModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'waitingRoomModal';
        modalContainer.style.cssText = `
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            justify-content: center;
            align-items: center;
        `;
        document.body.appendChild(modalContainer);
    }

    // Create modal content matching the style of other modals
    modalContainer.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #0f1922, #1a2332);
            border: 1px solid rgba(74, 207, 160, 0.3);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
            font-family: 'Ubuntu', sans-serif;
        ">
            <h2 style="
                color: #4acfa0;
                margin-bottom: 2rem;
                font-size: 2rem;
                text-shadow: 0 2px 10px rgba(74, 207, 160, 0.5);
            ">Waiting Room</h2>

            <div style="
                background: rgba(74, 207, 160, 0.1);
                border: 1px solid rgba(74, 207, 160, 0.2);
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            ">
                <div style="font-size: 1.1rem; color: #aaa; margin-bottom: 0.5rem;">
                    Arena ${data.arenaId}
                </div>
                <div style="font-size: 2.5rem; font-weight: bold; color: #4acfa0; margin: 0.5rem 0;">
                    ${data.playersWaiting} / ${data.minPlayers}
                </div>
                <div style="font-size: 1rem; color: #888; margin-top: 0.5rem;">
                    ${data.playersWaiting < data.minPlayers ?
                        `Waiting for ${data.minPlayers - data.playersWaiting} more player${data.minPlayers - data.playersWaiting > 1 ? 's' : ''}...` :
                        'Game will start soon!'}
                </div>
            </div>

            <div id="waitingPlayersList" style="margin-bottom: 1.5rem;"></div>

            <button id="leaveWaitingRoomBtn" style="
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                padding: 0.75rem 2rem;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                text-transform: uppercase;
                letter-spacing: 1px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.3)'">
                Leave Waiting Room
            </button>
        </div>
    `;

    // Add event listener for leave button
    document.getElementById('leaveWaitingRoomBtn').addEventListener('click', function() {
        leaveWaitingRoom();
    });
}

function updateWaitingRoomUI(data) {
    const modal = document.getElementById('waitingRoomModal');
    if (!modal) return;

    // Find the player count element
    const countElement = modal.querySelector('div[style*="font-size: 2.5rem"]');
    if (countElement) {
        countElement.textContent = `${data.playersWaiting} / ${data.minPlayers}`;
    }

    // Update waiting message
    const messageElement = modal.querySelector('div[style*="font-size: 1rem"][style*="color: #888"]');
    if (messageElement) {
        messageElement.innerHTML = data.playersWaiting < data.minPlayers ?
            `Waiting for ${data.minPlayers - data.playersWaiting} more player${data.minPlayers - data.playersWaiting > 1 ? 's' : ''}...` :
            'Game will start soon!';
    }

    // Only show players list if there are 2 or more players
    const listElement = document.getElementById('waitingPlayersList');
    if (listElement) {
        if (data.players && data.players.length > 1) {
            listElement.innerHTML = `
                <div style="
                    background: rgba(74, 207, 160, 0.05);
                    border: 1px solid rgba(74, 207, 160, 0.1);
                    border-radius: 10px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                ">
                    <div style="color: #888; margin-bottom: 0.5rem; font-size: 0.9rem;">Players ready:</div>
                    ${data.players.map(p => `
                        <div style="
                            padding: 0.25rem;
                            color: ${p.ready ? '#4acfa0' : '#aaa'};
                            font-size: 0.95rem;
                        ">
                            ${p.name} ${p.ready ? '✓' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Clear the list if only 1 player
            listElement.innerHTML = '';
        }
    }
}

function hideWaitingRoomUI() {
    const modal = document.getElementById('waitingRoomModal');
    if (modal) {
        modal.remove();
    }

    // Restore game canvas opacity
    const gameCanvas = document.getElementById('canvas');
    if (gameCanvas) {
        gameCanvas.style.opacity = '1';
    }

    // Restore score display
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
        scoreElement.style.display = '';
    }
}

function showCountdownUI(seconds) {
    hideWaitingRoomUI();

    let countdown = document.getElementById('countdownOverlay');
    if (!countdown) {
        countdown = document.createElement('div');
        countdown.id = 'countdownOverlay';
        countdown.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(countdown);

        // Create inner text element for the countdown number
        const countdownText = document.createElement('div');
        countdownText.id = 'countdownText';
        countdownText.style.cssText = `
            font-size: 150px;
            font-weight: bold;
            color: #00ff00;
            text-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
            font-family: 'Ubuntu', sans-serif;
            text-align: center;
            line-height: 1;
        `;
        countdown.appendChild(countdownText);
    }

    const textElement = document.getElementById('countdownText');
    textElement.textContent = seconds;

    // Simple fade-in animation
    textElement.style.opacity = '0';
    textElement.style.transform = 'scale(0.8)';
    setTimeout(() => {
        textElement.style.transition = 'all 0.3s ease';
        textElement.style.opacity = '1';
        textElement.style.transform = 'scale(1)';
    }, 10);

    // Play escape countdown sound when countdown starts (only on first call)
    if (seconds === 3 && global.soundEnabled) {
        try {
            const escapeSound = document.getElementById('escape_sound');
            if (escapeSound) {
                escapeSound.volume = 0.5;
                escapeSound.currentTime = 0;
                escapeSound.play().catch(function(e) {
                    console.log('Countdown sound playback failed:', e);
                });
            }
        } catch (e) {
            console.log('Countdown sound not available:', e);
        }
    }
}

function updateCountdownUI(seconds) {
    const textElement = document.getElementById('countdownText');
    if (!textElement) return;

    textElement.textContent = seconds > 0 ? seconds : 'GO!';

    // Keep font size consistent to prevent jumping
    textElement.style.fontSize = '150px';

    // Change color as countdown progresses
    if (seconds === 3) {
        textElement.style.color = '#00ff00';
    } else if (seconds === 2) {
        textElement.style.color = '#ffff00';
    } else if (seconds === 1) {
        textElement.style.color = '#ff6600';
    } else if (seconds === 0) {
        textElement.style.color = '#ff0000';
    }

    // Simple pulse animation without changing size
    textElement.style.opacity = '0.7';
    textElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
        textElement.style.opacity = '1';
        textElement.style.transform = 'scale(1)';
    }, 50);
}

function hideCountdownUI() {
    const countdown = document.getElementById('countdownOverlay');
    if (countdown) {
        countdown.remove();
    }
}

// Leave waiting room function
function leaveWaitingRoom() {
    // Leaving waiting room

    // Tell server we're leaving the waiting room
    if (socket) {
        socket.emit('leaveWaitingRoom');
    }

    // Reset waiting room state
    window.inWaitingRoom = false;
    window.countdownActive = false;

    // Hide UI
    hideWaitingRoomUI();
    hideCountdownUI();

    // Return to landing page
    cleanupGame();
    returnToLanding("You left the waiting room");
}

// Setup leaderboard toggle for all devices
function setupLeaderboardToggle() {
    var statusEl = document.getElementById("status");
    if (!statusEl) return;

    // Add click listener to entire leaderboard for easy toggling
    statusEl.addEventListener("click", function(e) {
        // Prevent event bubbling
        e.stopPropagation();

        // Toggle expanded class immediately
        this.classList.toggle("expanded");

        // Just toggle visibility, don't re-render entire HTML
        var expandIcon = this.querySelector('.expand-icon');
        var leaderboardEntries = this.querySelectorAll('.leaderboard-entry');
        var moreIndicator = this.querySelector('.leaderboard-more');

        if (this.classList.contains("expanded")) {
            // Show all entries
            if (expandIcon) expandIcon.textContent = '▼';
            for (var i = 1; i < leaderboardEntries.length; i++) {
                leaderboardEntries[i].style.display = '';
            }
            if (moreIndicator) moreIndicator.style.display = 'none';
        } else {
            // Show only first entry
            if (expandIcon) expandIcon.textContent = '▶';
            for (var i = 1; i < leaderboardEntries.length; i++) {
                leaderboardEntries[i].style.display = 'none';
            }
            if (moreIndicator) moreIndicator.style.display = '';
        }
    });
}


window.onload = function () {
    // Landing page is handled by landing.js

    // Set up leaderboard click handler for mobile
    setupLeaderboardToggle();

    // Hidden start button for auto-start
    var btn = document.getElementById("startButton"),
        btnS = document.getElementById("spectateButton"),
        nickErrorText = document.querySelector("#startMenu .input-error");

    if (btnS) {
        btnS.onclick = function () {
            startGame("spectator");
        };
    }

    if (btn) {
        btn.onclick = function () {
            // Auto-play for hidden button
            playerNameInput.value = generateGuestName();
            startGame("player");
        };
    }

    // Settings button is now handled in landing.js

    // Settings synchronization
    var settingsMenu = document.getElementById("settingsButton");
    var settings = document.getElementById("settings");

    if (settingsMenu) {
        settingsMenu.onclick = function () {
            if (settings.style.maxHeight == "300px") {
                settings.style.maxHeight = "0px";
            } else {
                settings.style.maxHeight = "300px";
            }
        };
    }

    playerNameInput.addEventListener("keypress", function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            playerNameInput.value = generateGuestName();
            startGame("player");
        }
    });
};

// TODO: Break out into GameControls.

var playerConfig = {
    border: 6,
    textColor: "#FFFFFF",
    textBorder: "#000000",
    textBorderSize: 3,
    defaultSize: 30,
};

var player = {
    id: -1,
    x: global.screen.width / 2,
    y: global.screen.height / 2,
    screenWidth: global.screen.width,
    screenHeight: global.screen.height,
    target: { x: global.screen.width / 2, y: global.screen.height / 2 },
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var cellsToDraw = []; // Reused each frame to reduce GC pressure
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();

// Toggle functions for settings
function toggleDarkMode() {
    var LIGHT = "#f2fbff",
        DARK = "#181818";
    var LINELIGHT = "#000000",
        LINEDARK = "#ffffff";

    if (global.backgroundColor === LIGHT) {
        global.backgroundColor = DARK;
        global.lineColor = LINEDARK;
    } else {
        global.backgroundColor = LIGHT;
        global.lineColor = LINELIGHT;
    }

    var darkModeCheckbox = document.getElementById("darkMode");
    if (darkModeCheckbox) {
        darkModeCheckbox.checked = (global.backgroundColor === DARK);
    }
    var darkModeGameCheckbox = document.getElementById("darkModeGame");
    if (darkModeGameCheckbox) {
        darkModeGameCheckbox.checked = (global.backgroundColor === DARK);
    }
}

function toggleBorder() {
    global.borderDraw = !global.borderDraw;
}

function toggleMass() {
    global.toggleMassState = global.toggleMassState === 0 ? 1 : 0;
}

function toggleContinuity() {
    global.continuity = !global.continuity;
}

function toggleRoundFood() {
    global.foodSides = global.foodSides < 10 ? 10 : 5;
}

function toggleFpsDisplay() {
    global.showFpsCounter = !global.showFpsCounter;
    if (global.fpsCounter) {
        global.fpsCounter.style.display = global.showFpsCounter ? "block" : "none";
    }
    var showFpsCheckbox = document.getElementById("showFps");
    if (showFpsCheckbox) {
        showFpsCheckbox.checked = global.showFpsCounter;
    }
    var showFpsGameCheckbox = document.getElementById("showFpsGame");
    if (showFpsGameCheckbox) {
        showFpsGameCheckbox.checked = global.showFpsCounter;
    }
}

var visibleBorderSetting = document.getElementById("visBord");
visibleBorderSetting.onchange = toggleBorder;

var showMassSetting = document.getElementById("showMass");
showMassSetting.onchange = toggleMass;

var continuitySetting = document.getElementById("continuity");
continuitySetting.onchange = toggleContinuity;

var roundFoodSetting = document.getElementById("roundFood");
roundFoodSetting.onchange = toggleRoundFood;

var showFpsSetting = document.getElementById("showFps");
showFpsSetting.onchange = toggleFpsDisplay;

var darkModeSetting = document.getElementById("darkMode");
darkModeSetting.onchange = toggleDarkMode;

// Sync game settings modal checkboxes
var visBordGame = document.getElementById("visBordGame");
if (visBordGame) {
    visBordGame.onchange = function () {
        visibleBorderSetting.checked = this.checked;
        toggleBorder();
    };
}

var showMassGame = document.getElementById("showMassGame");
if (showMassGame) {
    showMassGame.onchange = function () {
        showMassSetting.checked = this.checked;
        toggleMass();
    };
}

var continuityGame = document.getElementById("continuityGame");
if (continuityGame) {
    continuityGame.onchange = function () {
        continuitySetting.checked = this.checked;
        toggleContinuity();
    };
}

var roundFoodGame = document.getElementById("roundFoodGame");
if (roundFoodGame) {
    roundFoodGame.onchange = function () {
        roundFoodSetting.checked = this.checked;
        toggleRoundFood();
    };
}

var darkModeGame = document.getElementById("darkModeGame");
if (darkModeGame) {
    darkModeGame.onchange = function () {
        darkModeSetting.checked = this.checked;
        toggleDarkMode();
    };
}

var showFpsGame = document.getElementById("showFpsGame");
if (showFpsGame) {
    showFpsGame.onchange = function () {
        showFpsSetting.checked = this.checked;
        toggleFpsDisplay();
    };
}

var c = window.canvas.cv;
var graph = c.getContext("2d");

// Mobile button handlers - using vanilla JS for reliability
(function setupMobileControls() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileButtons);
    } else {
        initMobileButtons();
    }

    function initMobileButtons() {
        // Feed/Eject button
        var feedBtn = document.getElementById('feed');
        if (feedBtn) {
            ['touchstart', 'click'].forEach(function(eventType) {
                feedBtn.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Play eject mass sound directly (like escape button does)
                    if (global.soundEnabled) {
                        try {
                            const ejectSound = document.getElementById('eject_mass_sound');
                            if (ejectSound) {
                                ejectSound.volume = 0.5;
                                ejectSound.currentTime = 0;
                                ejectSound.play().catch(function(err) {
                                    console.log('Eject sound playback failed:', err);
                                });
                            }
                        } catch (soundError) {
                            console.log('Sound error:', soundError);
                        }
                    }

                    if (socket) {
                        socket.emit("1");
                    }
                }, {passive: false});
            });
        } else {
            console.warn('Feed button not found!');
        }

        // Split button
        var splitBtn = document.getElementById('split');
        if (splitBtn) {
            ['touchstart', 'click'].forEach(function(eventType) {
                splitBtn.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Split button pressed - emitting event 2 (split)
                    if (global.soundEnabled) {
                        document.getElementById('split_cell').play();
                    }
                    if (socket) {
                        socket.emit("2");
                        window.canvas.reenviar = false;
                    }
                }, {passive: false});
            });
            // Split button handler attached
        }

        // Exit button
        var exitBtn = document.getElementById('exit');
        if (exitBtn) {
            ['touchstart', 'click'].forEach(function(eventType) {
                exitBtn.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Exit button pressed
                    if (global.gameStart) {
                        // Play escape sound
                        if (global.soundEnabled) {
                            try {
                                const escapeSound = document.getElementById('escape_sound');
                                if (escapeSound) {
                                    escapeSound.volume = 0.5;
                                    escapeSound.currentTime = 0;
                                    escapeSound.play().catch(function(err) {
                                        console.log('Escape sound playback failed:', err);
                                    });
                                }
                            } catch (err) {
                                console.log('Escape sound not available:', err);
                            }
                        }
                        exitGame();
                    }
                }, {passive: false});
            });
            // Exit button handler attached
        }
    }
})();

// Directional pad control - touch anywhere on screen
(function () {
    var canvas = document.getElementById("cvs");
    var touchCenterIndicator = document.getElementById("touchCenter");
    var touchCenterX = 0;
    var touchCenterY = 0;
    var isMoving = false;
    var movingTouchId = null;

    if (canvas) {
        canvas.addEventListener("touchstart", function (e) {
            // Check if this touch is on a button
            var touch = e.touches[0];
            var element = document.elementFromPoint(
                touch.clientX,
                touch.clientY
            );

            if (element) {
                var isButton =
                    element.id === "split" ||
                    element.id === "feed" ||
                    element.id === "exit" ||
                    element.closest("#split") ||
                    element.closest("#feed") ||
                    element.closest("#exit");

                if (isButton) {
                    return; // Let button handle this
                }
            }

            e.preventDefault();

            // Set the touch point as the center of the directional pad
            touchCenterX = touch.clientX;
            touchCenterY = touch.clientY;
            movingTouchId = touch.identifier;
            isMoving = true;

            // Show visual indicator at touch center
            if (touchCenterIndicator) {
                touchCenterIndicator.style.left = touchCenterX + "px";
                touchCenterIndicator.style.top = touchCenterY + "px";
                touchCenterIndicator.style.display = "block";
            }
        });

        canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();

            if (isMoving) {
                // Find the touch that started the movement
                var touch = null;
                for (var i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === movingTouchId) {
                        touch = e.touches[i];
                        break;
                    }
                }

                if (touch) {
                    var deltaX = touch.clientX - touchCenterX;
                    var deltaY = touch.clientY - touchCenterY;

                    // Update target position
                    global.target.x = deltaX * 3;
                    global.target.y = deltaY * 3;
                }
            }
        });

        canvas.addEventListener("touchend", function (e) {
            e.preventDefault();

            // Check if the moving touch has ended
            var touchStillActive = false;
            for (var i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === movingTouchId) {
                    touchStillActive = true;
                    break;
                }
            }

            if (!touchStillActive) {
                isMoving = false;
                movingTouchId = null;

                // Reset target
                global.target.x = 0;
                global.target.y = 0;

                // Hide visual indicator
                if (touchCenterIndicator) {
                    touchCenterIndicator.style.display = "none";
                }
            }
        });

        canvas.addEventListener("touchcancel", function (e) {
            e.preventDefault();
            isMoving = false;
            movingTouchId = null;
            global.target.x = 0;
            global.target.y = 0;

            // Hide visual indicator
            if (touchCenterIndicator) {
                touchCenterIndicator.style.display = "none";
            }
        });
    }
})();

function handleDisconnect() {
    socket.close();
    if (!global.kicked) {
        // We have a more specific error message
        render.drawErrorMessage("Disconnected!", graph, global.screen);
    }
}

// socket stuff.
function setupSocket(socket) {
    // Connection event handlers for better user feedback
    socket.on("connect", function() {
        // Socket connected successfully
        // Hide any connection error messages
        if (global.connectionErrorShown) {
            global.connectionErrorShown = false;
        }
    });

    socket.on("reconnect", function(attemptNumber) {
        // Reconnected after attempts
        // Optionally show success message briefly
        if (global.gameStart) {
            // Reset animations on reconnect to ensure clean state
            cellAnimations.reset();
            // Request fresh game state after reconnection
            socket.emit("respawn");
        }
    });

    socket.on("reconnect_attempt", function(attemptNumber) {
        // Reconnection attempt
        if (!global.connectionErrorShown && global.gameStart) {
            render.drawErrorMessage("Reconnecting...", graph, global.screen);
            global.connectionErrorShown = true;
        }
    });

    socket.on("reconnect_failed", function() {
        // Reconnection failed after all attempts
        render.drawErrorMessage("Connection Lost - Please Refresh", graph, global.screen);
    });

    // Handle ping.
    socket.on("pongcheck", function () {
        var latency = Date.now() - global.startPingTime;
        debug("Latency: " + latency + "ms");
    });

    // Handle error.
    socket.on("connect_error", function(error) {
        console.error("[Socket] Connection error:", error.message);
        // Don't immediately show disconnect message - let reconnection try first
        if (socket.io.reconnecting === false) {
            handleDisconnect();
        }
    });

    socket.on("disconnect", function(reason) {
        // Socket disconnected
        // Only show disconnect for unexpected disconnects (not user-initiated)
        if (reason === "io server disconnect" || reason === "ping timeout") {
            handleDisconnect();
        } else if (reason === "transport close" || reason === "transport error") {
            // Let automatic reconnection handle these
            // Connection issue, will attempt reconnection
        }
    });

    // Handle connection.
    socket.on("welcome", function (playerSettings, gameSizes) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;
        player.target = window.canvas.target;
        global.player = player;
        socket.emit("gotit", player);
        global.gameStart = true;

        // Store arena ID for multi-arena support
        if (gameSizes.arenaId) {
            global.arenaId = gameSizes.arenaId;
            // Joined arena
        }

        // Start music only if not flagged for waiting room (direct spawn into active game)
        // We check a small delay to see if waitingRoom event comes immediately after
        setTimeout(function() {
            if (!window.inWaitingRoom && global.gameStart) {
                window.setupBackgroundMusic();
            }
        }, 100);

        // Reset cell animations for new game session
        cellAnimations.reset();

        // Reset prediction system for new game session
        predictionSystem.reset();

        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();

        // Request fullscreen for mobile immersive experience
        requestMobileFullscreen();
    });

    socket.on("playerDied", (data) => {
        // Player death notification removed (chat feature removed)
    });

    socket.on("playerDisconnect", (data) => {
        // Player disconnect notification removed (chat feature removed)
    });

    socket.on("playerJoin", (data) => {
        // Player join notification removed (chat feature removed)
    });

    socket.on("playerEaten", (data) => {
        // Play player eaten sound when current player eats another player
        // Player eaten

        if (global.soundEnabled) {
            try {
                const playerEatenSound = document.getElementById('player_eaten_sound');
                if (playerEatenSound) {
                    playerEatenSound.volume = 0.5;
                    playerEatenSound.currentTime = 0;
                    playerEatenSound.play().catch(function(e) {
                        console.log('Player eaten sound playback failed:', e);
                    });
                }
            } catch (e) {
                console.log('Player eaten sound not available:', e);
            }
        }
    });

    function renderLeaderboard(data) {
        leaderboard = data.leaderboard;
        var statusEl = document.getElementById("status");
        if (!statusEl) return;

        var isExpanded = statusEl.classList.contains("expanded");

        // Use array join for better string concatenation performance
        var statusParts = [];
        statusParts.push('<div class="leaderboard-header">');
        statusParts.push('LEADERBOARD');
        statusParts.push('<span class="expand-icon">' + (isExpanded ? '▼' : '▶') + '</span>');
        statusParts.push('</div>');
        statusParts.push('<div class="leaderboard-content">');
        statusParts.push('<div class="leaderboard-list">');

        // Always render ALL entries, we'll hide them with CSS
        for (var i = 0; i < leaderboard.length; i++) {
            var displayName = leaderboard[i].name.length !== 0 ? leaderboard[i].name : "An unnamed cell";
            // Truncate long names
            if (displayName.length > 12) {
                displayName = displayName.substring(0, 10) + "...";
            }

            var score = leaderboard[i].score || 0;
            var displayScore = score.toLocaleString('en-US', { maximumFractionDigits: 0 });

            // Add rank with medals for top 3
            var rank = "";
            if (i === 0) rank = "🥇";
            else if (i === 1) rank = "🥈";
            else if (i === 2) rank = "🥉";
            else rank = (i + 1);

            var entryClass = leaderboard[i].id == player.id ? "me" : "";
            if (i < 3) entryClass += " top3";

            // Hide entries after first one when collapsed
            var style = (!isExpanded && i > 0) ? ' style="display:none"' : '';

            statusParts.push('<div class="leaderboard-entry ' + entryClass + '"' + style + '>');
            statusParts.push('<span class="rank">' + rank + '</span>');
            statusParts.push('<span class="name">' + displayName + '</span>');
            statusParts.push('<span class="score">' + displayScore + '</span>');
            statusParts.push('</div>');
        }

        // Show collapsed indicator when collapsed
        var moreStyle = !isExpanded && leaderboard.length > 1 ? '' : ' style="display:none"';
        if (leaderboard.length > 1) {
            statusParts.push('<div class="leaderboard-more"' + moreStyle + '>+' + (leaderboard.length - 1) + ' more</div>');
        }

        statusParts.push('</div>');
        statusParts.push('</div>');

        // Single DOM update for best performance
        statusEl.innerHTML = statusParts.join('');
    }

    socket.on("leaderboard", (data) => {
        window.lastLeaderboardData = data;
        renderLeaderboard(data);
    });

    // Chat feature removed

    // Handle movement.
    socket.on(
        "serverTellPlayerMove",
        function (playerData, userData, foodsList, massList, virusList) {


            if (global.playerType == "player") {
                var now = getTime();

                // Update non-position data directly
                player.hue = playerData.hue;
                player.massTotal = playerData.massTotal;
                player.score = playerData.cells.reduce((sum, cell) => sum + (cell.score || 0), 0);

                // Update prediction system with server data
                const predictedState = predictionSystem.updatePlayerState(playerData, now);
                player.x = predictedState.x;
                player.y = predictedState.y;
                player.cells = predictedState.cells;

                // Check for merge/split events to play sounds
                const event = predictionSystem.calculatePlayerVelocity();
                if (event) {
                    if (event.type === 'merge') {
                        // Play remerge sound
                        if (global.soundEnabled) {
                            try {
                                const remergeSoundEl = document.getElementById('remerge_cell');
                                if (remergeSoundEl) {
                                    remergeSoundEl.volume = 0.5;
                                    remergeSoundEl.currentTime = 0;
                                    remergeSoundEl.play().catch(e => console.log('Remerge sound failed:', e));
                                }
                            } catch (e) {
                                console.log('Remerge sound not available:', e);
                            }
                        }
                    } else if (event.type === 'split') {
                        // Play virus split sound
                        if (global.soundEnabled) {
                            try {
                                const virusSplitSound = document.getElementById('virus_split_sound');
                                if (virusSplitSound) {
                                    virusSplitSound.volume = 0.5;
                                    virusSplitSound.currentTime = 0;
                                    virusSplitSound.play().catch(e => console.log('Virus split sound failed:', e));
                                }
                            } catch (e) {
                                console.log('Virus split sound not available:', e);
                            }
                        }
                    }
                }

                // Update player score display with enhanced features
                updatePlayerScoreDisplay(player);
            }
            // Store other players' data and calculate their velocities
            var now = getTime();

            // Create a set of current player IDs for cleanup
            var currentPlayerIds = {};
            for (var i = 0; i < userData.length; i++) {
                currentPlayerIds[userData[i].id] = true;
            }

            // Add current player to active IDs for animation cleanup
            currentPlayerIds[player.id] = true;

            // Clean up disconnected players from prediction
            predictionSystem.cleanupDisconnectedPlayers(currentPlayerIds);

            // Clean up animation states for disconnected players
            cellAnimations.cleanupDisconnectedPlayers(currentPlayerIds);

            for (var i = 0; i < userData.length; i++) {
                var user = userData[i];

                // Detect merges for all players (including current player in userData)
                if (cellAnimations && user && user.cells) {
                    cellAnimations.detectMerges(user.id, user.cells);
                }

                if (user.id === player.id) continue; // Skip current player for prediction

                // Update other player's prediction state
                predictionSystem.updateOtherPlayer(user.id, user, now);
            }

            users = userData;
            foods = foodsList;
            viruses = virusList;
            fireFood = massList;
        }
    );

    // Death.
    socket.on("RIP", function () {
        // Use unified exit handler for death
        handleGameExit('death');

        // Stop background music when player dies (already handled in cleanupGame but keep for safety)
        try {
            const backgroundMusic = document.getElementById('background_music');
            if (backgroundMusic) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        } catch (e) {
            console.log('Error stopping background music on death:', e);
        }

        // Stop escape sound if it's playing (in case player died during escape countdown)
        try {
            const escapeSound = document.getElementById('escape_sound');
            if (escapeSound) {
                escapeSound.pause();
                escapeSound.currentTime = 0;
            }
        } catch (e) {
            console.log('Error stopping escape sound on death:', e);
        }

        // Removed: render.drawErrorMessage("You died!", graph, global.screen);
        // Now we go directly to landing page with notification

        // Play loss sound effect when player dies
        if (global.soundEnabled) {
            try {
                const lossSound = document.getElementById('loss_sound');
                if (lossSound) {
                    lossSound.volume = 0.7; // Slightly louder for dramatic effect
                    lossSound.currentTime = 0;
                    lossSound.play().catch(function(e) {
                        console.log('Loss sound playback failed:', e);
                    });
                }
            } catch (e) {
                console.log('Loss sound not available:', e);
            }
        }

        // Immediately return to landing page instead of old menu
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

                // Display last score with death styling
                displayLastScore(true);


                // Cleanup
                if (global.animLoopHandle) {
                    window.cancelAnimationFrame(global.animLoopHandle);
                    global.animLoopHandle = undefined;
                }

                // Disconnect socket and clear all references
                if (socket) {
                    socket.disconnect();
                    socket = null;
                    window.canvas.socket = null;
                    global.socket = null;
                }
            } else {
                // Fallback to old menu if landing page not found
                document.getElementById("gameAreaWrapper").style.opacity = 0;
                document.getElementById("startMenuWrapper").style.maxHeight =
                    "1000px";
                if (global.animLoopHandle) {
                    window.cancelAnimationFrame(global.animLoopHandle);
                    global.animLoopHandle = undefined;
                }
            }
    });

    socket.on("kick", function (reason) {
        // Kick handler for admin kicks or other reasons (not inactivity)
        // Inactivity kicks have been removed from the game
        let userMessage = reason;

        // Use unified exit handler instead of showing ugly canvas message
        handleGameExit('kick', userMessage);
        socket.close();
    });

    // Escape event handlers (server-authoritative)
    socket.on("escapeStarted", function (data) {
        // Escape started
        exitCountdownActive = true;
        exitCountdownValue = data.countdown;
    });

    socket.on("escapeUpdate", function (data) {
        // Escape countdown update
        exitCountdownValue = data.countdown;
    });

    socket.on("escapeComplete", function () {
        // Escape complete
        exitCountdownActive = false;
        exitCountdownValue = 0;

        // Play end of game sound for successful exit
        if (global.soundEnabled) {
            try {
                const endGameSound = document.getElementById('end_of_game_sound');
                if (endGameSound) {
                    endGameSound.volume = 0.6;
                    endGameSound.currentTime = 0;
                    endGameSound.play().catch(function(e) {
                        console.log('End of game sound playback failed:', e);
                    });
                }
            } catch (e) {
                console.log('End of game sound not available:', e);
            }
        }

        // Use unified exit handler for successful escape
        handleGameExit('escape');
    });

    socket.on("escapeCancelled", function () {
        // Escape cancelled (player died during countdown)
        exitCountdownActive = false;
        exitCountdownValue = 4;

        // Stop escape sound
        try {
            const escapeSound = document.getElementById('escape_sound');
            if (escapeSound) {
                escapeSound.pause();
                escapeSound.currentTime = 0;
            }
        } catch (e) {
            console.log('Error stopping escape sound:', e);
        }
    });

    // Waiting room event handlers
    socket.on("waitingRoom", function (data) {
        // Entered waiting room
        window.inWaitingRoom = true;
        window.waitingRoomData = data;

        // Show waiting room UI
        showWaitingRoomUI(data);
    });

    socket.on("waitingRoomUpdate", function (data) {
        // Waiting room update
        updateWaitingRoomUI(data);
    });

    socket.on("countdownStart", function (data) {
        // Countdown started
        window.countdownActive = true;
        showCountdownUI(data.seconds);
    });

    socket.on("countdownUpdate", function (data) {
        updateCountdownUI(data.seconds);
    });

    socket.on("countdownCancelled", function (data) {
        // Countdown cancelled
        window.countdownActive = false;
        hideCountdownUI();
        showWaitingRoomUI(window.waitingRoomData);
    });

    socket.on("gameStart", function (data) {
        // Game starting
        window.inWaitingRoom = false;
        window.countdownActive = false;
        hideWaitingRoomUI();
        hideCountdownUI();

        // Start background music now that game is actually starting
        window.setupBackgroundMusic();

        // Request spawn
        socket.emit("respawn");
    });

    socket.on("arenaStarted", function (data) {
        // Arena has started
    });
}

const isUnnamedCell = (name) => name.length < 1;

const getPosition = (entity, player, screen) => {
    return {
        x: entity.x - player.x + screen.width / 2,
        y: entity.y - player.y + screen.height / 2,
    };
};

window.requestAnimFrame = (function () {
    return (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        }
    );
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame || window.mozCancelAnimationFrame;
})();

// FPS and UPS (Updates Per Second) tracking variables
var fpsCounter = document.getElementById("fpsCounter");
var frameCount = 0;
var lastFpsUpdate = 0;
var fpsUpdateInterval = 1000; // Update FPS display every second
var frameTimes = [];
var lastFrameTime = 0;
var fpsTrackingStarted = false;



// HSL color cache (avoid string concatenation every frame)
var colorCache = {};
function getHSLColor(hue, lightness) {
    var key = hue + '_' + lightness;
    if (!colorCache[key]) {
        colorCache[key] = 'hsl(' + hue + ', 100%, ' + lightness + '%)';
    }
    return colorCache[key];
}

// Clear color cache if it gets too large (memory leak prevention)
function clearColorCacheIfNeeded() {
    if (Object.keys(colorCache).length > 1000) {
        colorCache = {};
    }
}

// Initialize prediction system (configuration is now in config.js)
var predictionSystem = new PredictionSystem();



// Initialize FPS counter visibility from localStorage
(function () {
    global.fpsCounter = fpsCounter;
    try {
        var saved = localStorage.getItem("showFpsCounter");
        if (saved !== null) {
            global.showFpsCounter = saved === "true";
        }
        // Update checkbox state to match saved preference
        var showFpsCheckbox = document.getElementById("showFps");
        if (showFpsCheckbox) {
            showFpsCheckbox.checked = global.showFpsCounter;
        }
    } catch (e) {
        // Ignore localStorage errors
    }
})();

// Use performance.now() if available, fallback to Date.now()
var getTime = (function () {
    if (window.performance && window.performance.now) {
        return function () {
            return window.performance.now();
        };
    } else {
        return function () {
            return Date.now();
        };
    }
})();

// Initialize cell animations system
var cellAnimations = new CellAnimations({
    enabled: false,         // Currently disabled due to bugs
    duration: 500,         // Animation duration in ms
    easingFunction: 'cubicEaseOut'
});

function animloop() {
    var currentTime = getTime();

    // Initialize timing on first frame
    if (!fpsTrackingStarted) {
        lastFrameTime = currentTime;
        lastFpsUpdate = currentTime;
        fpsTrackingStarted = true;
    }

    var deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Track frame times for accurate FPS calculation (only if game is running)
    if (global.gameStart) {
        frameTimes.push(deltaTime);
        if (frameTimes.length > 60) {
            frameTimes.shift(); // Keep only last 60 frames
        }

        frameCount++;
    }

    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();

    // Show/hide FPS counter based on game state and user preference
    if (fpsCounter) {
        if (global.gameStart && global.showFpsCounter) {
            fpsCounter.style.display = "block";
            // Update FPS display periodically
            if (currentTime - lastFpsUpdate >= fpsUpdateInterval) {
                updateFpsDisplay();
                lastFpsUpdate = currentTime;
            }
        } else {
            fpsCounter.style.display = "none";
            // Reset frame and update tracking when game stops
            if (frameTimes.length > 0) {
                frameTimes = [];
                frameCount = 0;
            }
        }
    }
}

function updateFpsDisplay() {
    if (!fpsCounter) return;

    var displayText = "";
    var overallClass = "";

    // Calculate rendering FPS (framerate)
    if (frameTimes.length > 0) {
        var avgFrameTime =
            frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        var fps = Math.round(1000 / avgFrameTime);
        displayText += "FPS: " + fps;

        // Determine color based on FPS
        if (fps < 30) {
            overallClass = "low";
        } else if (fps < 50) {
            overallClass = "medium";
        } else {
            overallClass = "high";
        }
    }

    // Get position update rate from prediction system
    var ups = predictionSystem.getUpdateRate();
    if (ups > 0) {
        if (displayText.length > 0) {
            displayText += " | ";
        }
        displayText += "UPS: " + ups;

        // If UPS is very low, override color to indicate problem
        if (ups < 20) {
            overallClass = "low";
        } else if (ups < 35 && overallClass !== "low") {
            overallClass = "medium";
        }
    }

    // Update display
    if (displayText.length === 0) {
        fpsCounter.textContent = "FPS: -- | UPS: --";
    } else {
        fpsCounter.textContent = displayText;
    }

    // Apply color coding
    fpsCounter.className = overallClass;
}

// Helper function to check if entity is visible in viewport
function isEntityVisible(entity, screen, padding = 50) {
    return (
        entity.x + entity.radius + padding >= 0 &&
        entity.x - entity.radius - padding <= screen.width &&
        entity.y + entity.radius + padding >= 0 &&
        entity.y - entity.radius - padding <= screen.height
    );
}

// Throttle socket emissions to reduce network overhead
var lastSocketEmit = 0;
var socketEmitInterval = 16; // ~60fps for socket updates (every ~16ms)

function gameLoop() {
    if (global.gameStart) {
        // Use prediction system to extrapolate positions
        var now = getTime();
        var predictedState = predictionSystem.extrapolate(now);

        // Apply predicted state to player (only if we have valid prediction data)
        if (predictedState && predictedState.x !== undefined) {
            player.x = predictedState.x;
            player.y = predictedState.y;
            player.cells = predictedState.cells || [];
        }

        // Cache the camera position for this frame to ensure consistency
        // This prevents micro-stutters from different parts of the render using slightly different positions
        var frameCameraX = player.x;
        var frameCameraY = player.y;
        // Update predicted cells in users array for rendering
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === player.id) {
                // Current player - use predicted cells if available
                if (predictedState && predictedState.cells && predictedState.cells.length > 0) {
                    users[i].cells = predictedState.cells;
                }
            } else {
                // Other players - extrapolate their positions
                var predictedCells = predictionSystem.extrapolateOtherPlayer(users[i].id, now);
                if (predictedCells && predictedCells.length > 0) {
                    users[i].cells = predictedCells;
                }
            }
        }

        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);

        // Only draw grid if user preference allows it
        if (global.showGrid) {
            // Use cached camera position for consistent grid rendering
            var gridPlayer = { x: frameCameraX, y: frameCameraY };
            render.drawGrid(global, gridPlayer, global.screen, graph);
        }

        // Client-side viewport culling for food
        foods.forEach((food) => {
            // Inline position calculation to avoid object allocation (GC pressure reduction)
            let posX = food.x - frameCameraX + global.screen.width / 2;
            let posY = food.y - frameCameraY + global.screen.height / 2;
            if (
                isEntityVisible(
                    { x: posX, y: posY, radius: food.radius },
                    global.screen
                )
            ) {
                render.drawFood({ x: posX, y: posY }, food, graph);
            }
        });

        // Client-side viewport culling for fireFood
        fireFood.forEach((fireFood) => {
            // Inline position calculation to avoid object allocation (GC pressure reduction)
            let posX = fireFood.x - frameCameraX + global.screen.width / 2;
            let posY = fireFood.y - frameCameraY + global.screen.height / 2;
            if (
                isEntityVisible(
                    { x: posX, y: posY, radius: fireFood.radius },
                    global.screen
                )
            ) {
                render.drawFireFood({ x: posX, y: posY }, fireFood, playerConfig, graph);
            }
        });

        // Client-side viewport culling for viruses
        viruses.forEach((virus) => {
            // Inline position calculation to avoid object allocation (GC pressure reduction)
            let posX = virus.x - frameCameraX + global.screen.width / 2;
            let posY = virus.y - frameCameraY + global.screen.height / 2;
            if (
                isEntityVisible(
                    { x: posX, y: posY, radius: virus.radius },
                    global.screen
                )
            ) {
                render.drawVirus({ x: posX, y: posY }, virus, graph);
            }
        });

        let borders = {
            // Position of the borders on the screen
            left: global.screen.width / 2 - frameCameraX,
            right: global.screen.width / 2 + global.game.width - frameCameraX,
            top: global.screen.height / 2 - frameCameraY,
            bottom: global.screen.height / 2 + global.game.height - frameCameraY,
        };
        if (global.borderDraw) {
            render.drawBorder(borders, graph);
        }

        // Clear array instead of creating new one each frame (reduce GC pressure)
        cellsToDraw.length = 0;
        for (var i = 0; i < users.length; i++) {
            // Use cached HSL colors to avoid string concatenation
            let color = getHSLColor(users[i].hue, 50);
            let borderColor = getHSLColor(users[i].hue, 45);
            let isCurrentPlayer = users[i].id === player.id;
            for (var j = 0; j < users[i].cells.length; j++) {
                let screenX =
                    users[i].cells[j].x - frameCameraX + global.screen.width / 2;
                let screenY =
                    users[i].cells[j].y - frameCameraY + global.screen.height / 2;

                // Get animated radius for smooth merge animation
                let actualRadius = users[i].cells[j].radius;
                let animatedRadius = actualRadius;
                try {
                    if (cellAnimations) {
                        animatedRadius = cellAnimations.getAnimatedRadius(users[i].id, j, actualRadius);
                    }
                } catch (err) {
                    console.error('[CellAnimations] Error getting animated radius:', err);
                }

                // Client-side viewport culling for cells (use animated radius for visibility check)
                if (
                    isEntityVisible(
                        {
                            x: screenX,
                            y: screenY,
                            radius: animatedRadius,
                        },
                        global.screen
                    )
                ) {
                    cellsToDraw.push({
                        color: color,
                        borderColor: borderColor,
                        mass: users[i].cells[j].mass,
                        score: users[i].cells[j].score || 0,
                        name: users[i].name,
                        radius: animatedRadius, // Use animated radius for rendering
                        x: screenX,
                        y: screenY,
                        isCurrentPlayer: isCurrentPlayer,
                    });
                }
            }
        }
        cellsToDraw.sort(function (obj1, obj2) {
            return obj1.mass - obj2.mass;
        });
        render.drawCells(
            cellsToDraw,
            playerConfig,
            global.toggleMassState,
            borders,
            graph,
            exitCountdownActive,
            exitCountdownValue,
            player
        );

        // Throttle socket emissions instead of every frame
        var now = Date.now();
        if (now - lastSocketEmit >= socketEmitInterval) {
            socket.emit("0", window.canvas.target); // playerSendTarget movement update
            lastSocketEmit = now;
        }
    }
}

window.addEventListener("resize", resize);

function resize() {
    // Check both socket and player exist before trying to resize
    if (!socket || !player) return;

    player.screenWidth =
        c.width =
        global.screen.width =
            global.playerType == "player"
                ? window.innerWidth
                : global.game.width;
    player.screenHeight =
        c.height =
        global.screen.height =
            global.playerType == "player"
                ? window.innerHeight
                : global.game.height;

    if (global.playerType == "spectator") {
        player.x = global.game.width / 2;
        player.y = global.game.height / 2;
    }

    socket.emit("windowResized", {
        screenWidth: global.screen.width,
        screenHeight: global.screen.height,
    });
}

// Exit Game Functionality
var exitCountdownValue = 4;
var exitCountdownActive = false;

function exitGame() {
    // Request escape from server (server-authoritative)
    if (!socket || !global.gameStart) {
        return;
    }

    // Send escape request to server
    socket.emit("escapeRequest");

    // Escape request sent to server
}

function cleanupGame() {
    // Save last score before cleanup
    if (player && player.score !== undefined) {
        saveLastScore(player.score);
    }

    // Stop the game loop
    if (global.animLoopHandle) {
        window.cancelAnimationFrame(global.animLoopHandle);
        global.animLoopHandle = null;
    }

    // Stop background music
    try {
        const backgroundMusic = document.getElementById('background_music');
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    } catch (e) {
        console.log('Error stopping background music:', e);
    }

    // Stop escape sound if it's playing
    try {
        const escapeSound = document.getElementById('escape_sound');
        if (escapeSound) {
            escapeSound.pause();
            escapeSound.currentTime = 0;
        }
    } catch (e) {
        console.log('Error stopping escape sound:', e);
    }

    // Set game state to stopped
    global.gameStart = false;
    global.died = true;

    // Disconnect socket
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    // Clear any remaining entities
    foods = [];
    viruses = [];
    fireFood = [];
    users = [];

    // Reset prediction and animation systems
    predictionSystem.reset();
    cellAnimations.reset();

    // Reset player
    player = {
        id: -1,
        x: global.screen.width / 2,
        y: global.screen.height / 2,
        screenWidth: global.screen.width,
        screenHeight: global.screen.height,
        target: { x: global.screen.width / 2, y: global.screen.height / 2 },
    };
}

/**
 * Unified game exit handler for all exit scenarios
 * @param {string} reason - The reason for exiting ('death', 'escape', 'kick', 'disconnect')
 * @param {string} message - Optional message to display to the user
 */
function handleGameExit(reason, message) {
    // Save last score if applicable
    if (player && player.score !== undefined) {
        saveLastScore(player.score);
    }

    // Cleanup game
    cleanupGame();

    // Clear game state
    global.gameStart = false;
    player = null;
    users = [];
    leaderboard = [];
    target = {
        x: global.playerX,
        y: global.playerY
    };
    foods = [];
    viruses = [];
    fireFood = [];
    global.arenaId = null;

    // Return to landing page
    returnToLanding(reason, message);
}

function returnToLanding(exitReason, exitMessage) {
    var landingView = document.getElementById("landingView");
    var gameView = document.getElementById("gameView");

    if (landingView && gameView) {
        // Hide game view
        gameView.style.display = "none";
        document.getElementById("gameAreaWrapper").style.opacity = 0;

        // Show landing view
        landingView.style.display = "block";

        // Display last score on landing page
        displayLastScore();

        // Display exit message if provided
        if (exitMessage) {
            displayExitMessage(exitReason, exitMessage);
        }

        // Reset player name input if needed
        playerNameInput.value = "";
    }
}

/**
 * Display exit reason message on the landing page
 */
function displayExitMessage(reason, message) {
    // Always use the fixed exit message element
    const exitMessageEl = document.getElementById('exitMessage');
    if (!exitMessageEl) {
        console.warn('Exit message element not found');
        return;
    }

    // Style and show the message based on reason
    let messageHTML = '';
    let messageClass = 'exit-message ';

    switch(reason) {
        case 'kick':
            messageClass += 'exit-kick';
            messageHTML = '⚠️ ' + (message || 'You were kicked from the game');
            break;
        case 'death':
            messageClass += 'exit-death';
            messageHTML = '💀 You were eaten! Better luck next time!';
            break;
        case 'escape':
            messageClass += 'exit-success';
            messageHTML = '🏆 Successfully escaped the arena!';
            break;
        case 'disconnect':
            messageClass += 'exit-disconnect';
            messageHTML = '🔌 ' + (message || 'Connection lost');
            break;
        default:
            messageClass += 'exit-generic';
            messageHTML = message || 'Game ended';
    }

    exitMessageEl.className = messageClass;
    exitMessageEl.innerHTML = messageHTML;
    exitMessageEl.style.display = 'flex';  // Use flex for proper centering

    // Auto-hide the message after 5 seconds
    setTimeout(function() {
        if (exitMessageEl) {
            exitMessageEl.style.display = 'none';
        }
    }, 5000);
}

/**
 * Request fullscreen for mobile browsers
 * Provides an immersive gaming experience by hiding browser UI
 */
function requestMobileFullscreen() {
    // Only proceed on mobile devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
        return; // Not a touch device, skip
    }

    try {
        var elem = document.documentElement;

        // Try Fullscreen API first (works on many mobile browsers)
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err.message);
            });
        } else if (elem.webkitRequestFullscreen) { // iOS Safari
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }

        // For iOS Safari: Scroll to hide address bar
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);

        // Fullscreen requested for mobile
    } catch (e) {
        console.log('Could not request fullscreen:', e);
    }
}

// Save last score to localStorage
function saveLastScore(score) {
    try {
        // Round to 2 decimals for display consistency
        var preciseScore = Math.round(score * 100) / 100;
        localStorage.setItem("lastScore", preciseScore);
    } catch (e) {
        console.log("Could not save last score:", e);
    }
}

// Display last score on landing page
function displayLastScore(isDeath = false) {
    try {
        var lastScore = localStorage.getItem("lastScore");
        var lastScoreBox = document.getElementById("lastScoreBox");
        var lastScoreValue = document.getElementById("lastScoreValue");

        if (lastScoreValue && lastScoreBox) {
            if (lastScore) {
                if (isDeath) {
                    // Death: Show encouraging message without amount
                    lastScoreValue.style.display = "none"; // Hide the score value

                    // Update the label to show loss message
                    const lastScoreLabel = lastScoreBox.querySelector('span:first-child');
                    if (lastScoreLabel) {
                        lastScoreLabel.textContent = "You lost ! Jump back in and prove them wrong !";
                        lastScoreLabel.style.color = "#ff4757"; // Red for loss
                        lastScoreLabel.style.fontSize = "1.1rem";
                        lastScoreLabel.style.fontWeight = "bold";
                    }

                    // Remove any encouraging message (we don't need it anymore)
                    const encourageMsg = lastScoreBox.querySelector('.encourage-message');
                    if (encourageMsg) {
                        encourageMsg.remove();
                    }

                    lastScoreBox.style.display = "flex";
                } else {
                    // Normal score display: format score and reset styling
                var formattedScore = parseFloat(lastScore);
                lastScoreValue.textContent = formattedScore;
                    lastScoreValue.style.color = ""; // Reset color
                    lastScoreValue.style.display = ""; // Show score value

                    // Reset label
                    const lastScoreLabel = lastScoreBox.querySelector('span:first-child');
                    if (lastScoreLabel) {
                        lastScoreLabel.textContent = "Last Score";
                        lastScoreLabel.style.color = "";
                        lastScoreLabel.style.fontSize = "";
                        lastScoreLabel.style.fontWeight = "";
                    }

                    // Remove encourage message if it exists
                    const encourageMsg = lastScoreBox.querySelector('.encourage-message');
                    if (encourageMsg) {
                        encourageMsg.remove();
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
}


// Initialize exit functionality - Keyboard ESC key trigger
document.addEventListener("keydown", function (event) {
    // Check if ESC key is pressed and game is active (and not in waiting room)
    if (event.key === "Escape" && global.gameStart && !window.inWaitingRoom) {
        event.preventDefault();
        // Play escape sound directly (helper function not in global scope)
        if (global.soundEnabled) {
            try {
                const escapeSound = document.getElementById('escape_sound');
                if (escapeSound) {
                    escapeSound.volume = 0.5;
                    escapeSound.currentTime = 0;
                    escapeSound.play().catch(function(e) {
                        console.log('Escape sound playback failed:', e);
                    });
                }
            } catch (e) {
                console.log('Escape sound not available:', e);
            }
        }
        exitGame();
    }
});

// Clear any previous game state flags on page load/refresh
window.addEventListener('beforeunload', function() {
    // Mark that we're about to refresh/leave the page
    sessionStorage.setItem('pageRefreshing', 'true');
});

// Display last score when DOM is ready, but not on page refresh
(function() {
if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            // Check if this is a page refresh
            const isRefresh = sessionStorage.getItem('pageRefreshing') === 'true';
            if (isRefresh) {
                // Clear the refresh flag and don't show last score
                sessionStorage.removeItem('pageRefreshing');
} else {
    displayLastScore();
}
        });
    } else {
        // Check if this is a page refresh
        const isRefresh = sessionStorage.getItem('pageRefreshing') === 'true';
        if (isRefresh) {
            // Clear the refresh flag and don't show last score
            sessionStorage.removeItem('pageRefreshing');
        } else {
            displayLastScore();
        }
    }
})();

// Fullscreen toggle button handler
(function() {
    var fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFullscreen();
        });

        // Also support touch events
        fullscreenBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleFullscreen();
        });

        // Update icon based on fullscreen state
        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);
    }

    function updateFullscreenIcon() {
        if (!fullscreenBtn) return;

        var icon = fullscreenBtn.querySelector('i');
        if (!icon) return;

        var isFullscreen = document.fullscreenElement ||
                          document.webkitFullscreenElement ||
                          document.mozFullScreenElement ||
                          document.msFullscreenElement;

        if (isFullscreen) {
            icon.className = 'fas fa-compress';
        } else {
            icon.className = 'fas fa-expand';
        }
    }

    function toggleFullscreen() {
        var doc = document;
        var docEl = doc.documentElement;

        var isFullscreen = doc.fullscreenElement ||
                          doc.webkitFullscreenElement ||
                          doc.mozFullScreenElement ||
                          doc.msFullscreenElement;

        if (!isFullscreen) {
            // Enter fullscreen
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen();
            } else if (docEl.mozRequestFullScreen) {
                docEl.mozRequestFullScreen();
            } else if (docEl.msRequestFullscreen) {
                docEl.msRequestFullscreen();
            }

            // Scroll to hide address bar on iOS
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
        } else {
            // Exit fullscreen
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                doc.msExitFullscreen();
            }
        }
    }
})();

// Export functions to global scope for landing page integration
window.startGame = startGame;
