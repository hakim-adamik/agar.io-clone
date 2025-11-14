var io = require("socket.io-client");
var render = require("./render");
var Canvas = require("./canvas");
var global = require("./global");

var playerNameInput = document.getElementById("playerNameInput");
var socket;

// Debug mode flag (accessible from browser console via window.DEBUG_MODE)
/*
window.DEBUG_MODE = false;
window.enableDebug = function() {
    window.DEBUG_MODE = true;
    console.log("%c[DEBUG MODE ENABLED]", "color: green; font-weight: bold");
    console.log("Performance warnings will be logged when large updates occur.");
};
window.disableDebug = function() {
    window.DEBUG_MODE = false;
    console.log("%c[DEBUG MODE DISABLED]", "color: orange; font-weight: bold");
};
*/

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
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
        console.log('Loading preferences for user:', privyUser.dbUserId);
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
    console.log("Applying user preferences:", prefs);

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


    // Function to set up seamless background music
    function setupBackgroundMusic() {
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

            // Start background music if enabled (after preferences are loaded)
            setupBackgroundMusic();
    } else {
        // Fallback for old flow
        document.getElementById("startMenuWrapper").style.maxHeight = "0px";
        document.getElementById("gameAreaWrapper").style.opacity = 1;

            // Start background music (fallback flow) if enabled
            setupBackgroundMusic();
        }

        // Show the player score display when game starts
        var playerScoreEl = document.getElementById("playerScore");
        if (playerScoreEl) {
            playerScoreEl.style.display = "block";
        }

        // ALWAYS create a new socket connection when starting the game
        // Even if socket exists, we need a fresh connection after death
        console.log("[Socket] Current socket state:", socket ? "exists" : "null");

        // Clean up any existing socket first
        if (socket) {
            console.log("[Socket] Cleaning up existing socket before creating new one");
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
                console.log("[Socket] Cleaning up previous connection");
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
        console.log('Loading user preferences for game start, userId:', privyUser.dbUserId);
        loadUserPreferences(privyUser.dbUserId).then(continueGameStart);
    } else {
        console.log('No authenticated user, applying default settings');
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

// Feed button - handle both click and touch
$("#feed").on("click touchstart", function (e) {
    e.preventDefault();
    e.stopPropagation();
    playSoundEffect('eject_mass_sound');
    socket.emit("1");
    window.canvas.reenviar = false;
});

// Split button - handle both click and touch
$("#split").on("click touchstart", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (global.soundEnabled) {
        document.getElementById('split_cell').play();
    }
    socket.emit("2");
    window.canvas.reenviar = false;
});

// Exit button - handle both click and touch
$("#exit").on("click touchstart", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (global.gameStart) {
        exitGame();
    }
});

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
        console.log("[Socket] Connected successfully");
        // Hide any connection error messages
        if (global.connectionErrorShown) {
            global.connectionErrorShown = false;
        }
    });

    socket.on("reconnect", function(attemptNumber) {
        console.log("[Socket] Reconnected after " + attemptNumber + " attempts");
        // Optionally show success message briefly
        if (global.gameStart) {
            // Reset animations on reconnect to ensure clean state
            cellAnimations.reset();
            // Request fresh game state after reconnection
            socket.emit("respawn");
        }
    });

    socket.on("reconnect_attempt", function(attemptNumber) {
        console.log("[Socket] Reconnection attempt #" + attemptNumber);
        if (!global.connectionErrorShown && global.gameStart) {
            render.drawErrorMessage("Reconnecting...", graph, global.screen);
            global.connectionErrorShown = true;
        }
    });

    socket.on("reconnect_failed", function() {
        console.log("[Socket] Reconnection failed after all attempts");
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
        console.log("[Socket] Disconnected:", reason);
        // Only show disconnect for unexpected disconnects (not user-initiated)
        if (reason === "io server disconnect" || reason === "ping timeout") {
            handleDisconnect();
        } else if (reason === "transport close" || reason === "transport error") {
            // Let automatic reconnection handle these
            console.log("[Socket] Connection issue, will attempt reconnection");
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
            console.log(`[CLIENT] Joined arena: ${gameSizes.arenaId}`);
        }

        // Reset cell animations for new game session
        cellAnimations.reset();

        // Reset smooth camera for new game session
        smoothCamera.enabled = false;
        smoothCamera.x = 0;
        smoothCamera.y = 0;

        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();
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
        console.log(`🍽️ Player eaten: ${data.eatenPlayerName} (+${data.massGained} mass)`);

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
            // Track position update timing
            var updateTime = getTime();
            if (lastPositionUpdateTime > 0) {
                var timeSinceLastUpdate = updateTime - lastPositionUpdateTime;
                positionUpdateTimes.push(timeSinceLastUpdate);
                if (positionUpdateTimes.length > 30) {
                    positionUpdateTimes.shift(); // Keep only last 30 updates
                }
            }
            lastPositionUpdateTime = updateTime;


            if (global.playerType == "player") {
                var now = getTime();

                // Update non-position data directly
                player.hue = playerData.hue;
                player.massTotal = playerData.massTotal;
                player.score = playerData.cells.reduce((sum, cell) => sum + (cell.score || 0), 0);

                // Client-side prediction: store server states and calculate velocity
                if (!prediction.enabled) {
                    // First update - initialize (using optimized cloning)
                    prediction.previous = {
                        x: playerData.x,
                        y: playerData.y,
                        cells: cloneCells(playerData.cells),
                        timestamp: now
                    };
                    prediction.current = {
                        x: playerData.x,
                        y: playerData.y,
                        cells: cloneCells(playerData.cells),
                        timestamp: now
                    };
                    prediction.predicted = {
                        x: playerData.x,
                        y: playerData.y,
                        cells: cloneCells(playerData.cells)
                    };
                    player.x = playerData.x;
                    player.y = playerData.y;
                    player.cells = playerData.cells;
                    prediction.enabled = true;

                    // Initialize smooth camera
                    smoothCamera.x = playerData.x;
                    smoothCamera.y = playerData.y;
                    smoothCamera.enabled = true;
                } else {
                    // Subsequent updates - shift states and calculate velocity (using optimized cloning)
                    prediction.previous = prediction.current;
                    prediction.current = {
                        x: playerData.x,
                        y: playerData.y,
                        cells: cloneCells(playerData.cells),
                        timestamp: now
                    };

                    // Calculate player camera velocity
                    var timeDelta = prediction.current.timestamp - prediction.previous.timestamp;

                    // Only calculate velocity if updates are far enough apart (prevent extreme velocities)
                    var minTimeDelta = 5; // ms - ignore updates closer than 5ms apart
                    if (timeDelta > minTimeDelta) {
                        var vx = (prediction.current.x - prediction.previous.x) / timeDelta;
                        var vy = (prediction.current.y - prediction.previous.y) / timeDelta;

                        // Sanity check: cap maximum velocity (prevent glitches from bad data)
                        var maxVelocity = 5; // pixels per ms (very generous, typical is ~0.5)
                        var velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
                        if (velocityMagnitude > maxVelocity) {
                            var scale = maxVelocity / velocityMagnitude;
                            vx *= scale;
                            vy *= scale;
                        }

                        prediction.velocity.x = vx;
                        prediction.velocity.y = vy;

                        // Calculate velocity for each cell (if cell count matches)
                        if (prediction.current.cells.length === prediction.previous.cells.length) {
                            prediction.cellVelocities = [];
                            for (var i = 0; i < prediction.current.cells.length; i++) {
                                var currCell = prediction.current.cells[i];
                                var prevCell = prediction.previous.cells[i];
                                var cellVx = (currCell.x - prevCell.x) / timeDelta;
                                var cellVy = (currCell.y - prevCell.y) / timeDelta;

                                // Cap cell velocity too
                                var cellVelMagnitude = Math.sqrt(cellVx * cellVx + cellVy * cellVy);
                                if (cellVelMagnitude > maxVelocity) {
                                    var cellScale = maxVelocity / cellVelMagnitude;
                                    cellVx *= cellScale;
                                    cellVy *= cellScale;
                                }

                                prediction.cellVelocities.push({
                                    vx: cellVx,
                                    vy: cellVy
                                });
                            }
                        } else {
                            // Cell count changed (split/merge) - reset velocities
                            prediction.cellVelocities = [];

                            // Detect merge vs split
                            var previousCellCount = prediction.previous.cells.length;
                            var currentCellCount = prediction.current.cells.length;

                            if (currentCellCount < previousCellCount) {
                                // MERGE DETECTED! Cells merged back together
                                console.log(`🔄 Cells merged! ${previousCellCount} → ${currentCellCount}`);

                                // Play remerge sound if sound is enabled
                                if (global.soundEnabled) {
                                    try {
                                        const remergeSoundEl = document.getElementById('remerge_cell');
                                        if (remergeSoundEl) {
                                            remergeSoundEl.volume = 0.5;
                                            remergeSoundEl.currentTime = 0;
                                            remergeSoundEl.play().catch(function(e) {
                                                console.log('Remerge sound playback failed:', e);
                                            });
                                        }
                                    } catch (e) {
                                        console.log('Remerge sound not available:', e);
                                    }
                                }
                            } else if (currentCellCount > previousCellCount) {
                                // SPLIT DETECTED! Virus collision caused cell split
                                console.log(`💥 Virus split! ${previousCellCount} → ${currentCellCount}`);

                                // Play virus split sound if sound is enabled
                                if (global.soundEnabled) {
                                    try {
                                        const virusSplitSound = document.getElementById('virus_split_sound');
                                        if (virusSplitSound) {
                                            virusSplitSound.volume = 0.5;
                                            virusSplitSound.currentTime = 0;
                                            virusSplitSound.play().catch(function(e) {
                                                console.log('Virus split sound playback failed:', e);
                                            });
                                        }
                                    } catch (e) {
                                        console.log('Virus split sound not available:', e);
                                    }
                                }
                            }
                        }
                    }

                    // Start predicting from current server state (using optimized cloning)
                    prediction.predicted.x = prediction.current.x;
                    prediction.predicted.y = prediction.current.y;
                    prediction.predicted.cells = cloneCells(prediction.current.cells);
                }

                // Update player score display with enhanced features
                updatePlayerScoreDisplay(player);
            }
            // Store other players' data and calculate their velocities
            var now = getTime();
            prediction.otherPlayers.timestamp = now;

            // Create a set of current player IDs for cleanup
            var currentPlayerIds = {};
            for (var i = 0; i < userData.length; i++) {
                currentPlayerIds[userData[i].id] = true;
            }

            // Add current player to active IDs for animation cleanup
            currentPlayerIds[player.id] = true;

            // Remove disconnected players from prediction states
            for (var playerId in prediction.otherPlayers.states) {
                if (!currentPlayerIds[playerId] && playerId != player.id) {
                    delete prediction.otherPlayers.states[playerId];
                }
            }

            // Clean up animation states for disconnected players
            cellAnimations.cleanupDisconnectedPlayers(currentPlayerIds);

            for (var i = 0; i < userData.length; i++) {
                var user = userData[i];

                // Detect merges for all players (including current player in userData)
                if (cellAnimations && user && user.cells) {
                    cellAnimations.detectMerges(user.id, user.cells);
                }

                if (user.id === player.id) continue; // Skip current player for prediction

                var playerId = user.id;
                if (!prediction.otherPlayers.states[playerId]) {
                    // First time seeing this player - initialize (using optimized cloning)
                    prediction.otherPlayers.states[playerId] = {
                        previous: { cells: [], timestamp: now },
                        current: { cells: cloneCells(user.cells), timestamp: now },
                        velocities: []
                    };
                } else {
                    // Update states and calculate velocity (using optimized cloning)
                    var playerState = prediction.otherPlayers.states[playerId];
                    playerState.previous = playerState.current;
                    playerState.current = {
                        cells: cloneCells(user.cells),
                        timestamp: now
                    };

                    // Calculate velocity for each cell
                    var timeDelta = playerState.current.timestamp - playerState.previous.timestamp;
                    var minTimeDelta = 5; // ms - ignore updates closer than 5ms apart

                    if (timeDelta > minTimeDelta && playerState.current.cells.length === playerState.previous.cells.length) {
                        playerState.velocities = [];
                        var maxVelocity = 5; // pixels per ms

                        for (var j = 0; j < playerState.current.cells.length; j++) {
                            var currCell = playerState.current.cells[j];
                            var prevCell = playerState.previous.cells[j];
                            var cellVx = (currCell.x - prevCell.x) / timeDelta;
                            var cellVy = (currCell.y - prevCell.y) / timeDelta;

                            // Cap velocity to prevent glitches
                            var cellVelMagnitude = Math.sqrt(cellVx * cellVx + cellVy * cellVy);
                            if (cellVelMagnitude > maxVelocity) {
                                var cellScale = maxVelocity / cellVelMagnitude;
                                cellVx *= cellScale;
                                cellVy *= cellScale;
                            }

                            playerState.velocities.push({
                                vx: cellVx,
                                vy: cellVy
                            });
                        }
                    } else {
                        playerState.velocities = [];
                    }
                }
            }

            users = userData;
            foods = foodsList;
            viruses = virusList;
            fireFood = massList;
        }
    );

    // Death.
    socket.on("RIP", function () {
        // Save last score before death
        if (player && player.score !== undefined) {
            saveLastScore(player.score);
        }

        global.gameStart = false;

        // Clear game state to prevent issues on quick replay
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

        // Clear arena ID to avoid conflicts - server will assign the appropriate arena
        global.arenaId = null;

        // Stop background music when player dies
        try {
            const backgroundMusic = document.getElementById('background_music');
            if (backgroundMusic) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        } catch (e) {
            console.log('Error stopping background music on death:', e);
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
        global.gameStart = false;
        global.kicked = true;
        if (reason !== "") {
            render.drawErrorMessage(
                "You were kicked for: " + reason,
                graph,
                global.screen
            );
        } else {
            render.drawErrorMessage("You were kicked!", graph, global.screen);
        }
        socket.close();
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

// Position update tracking (UPS - Updates Per Second)
var positionUpdateTimes = [];
var lastPositionUpdateTime = 0;

// Optimized cell cloning (much faster than JSON.parse(JSON.stringify()))
function cloneCells(cells) {
    if (!cells || cells.length === 0) return [];

    const cloned = new Array(cells.length);
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        cloned[i] = {
            x: cell.x,
            y: cell.y,
            mass: cell.mass,
            radius: cell.radius,
            score: cell.score
        };
    }
    return cloned;
}

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

// Client-side prediction with velocity extrapolation
var prediction = {
    enabled: false,
    // Last two server states to calculate velocity (for current player)
    previous: { x: 0, y: 0, cells: [], timestamp: 0 },
    current: { x: 0, y: 0, cells: [], timestamp: 0 },
    // Predicted state (what we render)
    predicted: { x: 0, y: 0, cells: [] },
    // Calculated velocities
    velocity: { x: 0, y: 0 },
    cellVelocities: [],

    // Other players prediction
    otherPlayers: {
        // Map of playerId -> { previous, current, velocities }
        states: {},
        timestamp: 0
    }
};

// Smooth camera interpolation to prevent jumps when cells merge
var smoothCamera = {
    enabled: false,
    // Rendered camera position (smoothly interpolated)
    x: 0,
    y: 0,
    // Interpolation speed (0-1, higher = faster)
    lerpSpeed: 0.15
};

// Cell merge animation system
class CellAnimations {
    constructor(duration = 500) {
        // FIXME Smooth merging animation is currently a bit buggy
        // Need to fix it then enable it again
        this.enabled = false;

        // Map of "playerId_cellIndex" -> { startRadius, targetRadius, startTime, duration }
        this.animations = {};

        // Animation duration in milliseconds
        this.duration = duration;

        // Track cell states to detect merges
        // Map of playerId -> [{ x, y, mass, radius }]
        this.previousCellStates = {};
    }

    // Start a new merge animation for a cell
    startAnimation(playerId, cellIndex, startRadius, targetRadius) {
        const key = `${playerId}_${cellIndex}`;

        // Check if there's already an animation in progress
        const existingAnimation = this.animations[key];
        if (existingAnimation) {
            const targetDiff = Math.abs(existingAnimation.targetRadius - targetRadius);
            if (targetDiff < 5) {
                // Target is very similar, don't restart the animation
                return;
            }

            // Target changed significantly (another merge happened during animation)
            // Use the current animated radius as the new starting point for smooth continuation
            const now = getTime();
            const elapsed = now - existingAnimation.startTime;

            if (elapsed < existingAnimation.duration) {
                // Animation still in progress - calculate current radius
                const progress = elapsed / existingAnimation.duration;
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentRadius = existingAnimation.startRadius +
                    (existingAnimation.targetRadius - existingAnimation.startRadius) * easeProgress;

                // Start new animation from current position
                startRadius = currentRadius;
            }
        }

        const now = getTime();
        this.animations[key] = {
            startRadius: startRadius,
            targetRadius: targetRadius,
            startTime: now,
            duration: this.duration
        };
    }

    // Get the current animated radius for a cell
    getAnimatedRadius(playerId, cellIndex, actualRadius) {
        if (!this.enabled) {
            return actualRadius; // Animations disabled
        }

        const key = `${playerId}_${cellIndex}`;
        const animation = this.animations[key];

        if (!animation) {
            return actualRadius; // No animation, use actual radius
        }

        const now = getTime();
        const elapsed = now - animation.startTime;

        if (elapsed >= animation.duration) {
            // Animation complete
            delete this.animations[key];
            return actualRadius;
        }

        // Ease-out interpolation for smooth animation
        const progress = elapsed / animation.duration;
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

        const currentRadius = animation.startRadius + (animation.targetRadius - animation.startRadius) * easeProgress;
        return currentRadius;
    }

    // Detect merges by comparing cell states
    detectMerges(playerId, newCells) {
        if (!this.enabled) {
            return; // Animations disabled, skip merge detection
        }

        const previousCells = this.previousCellStates[playerId];

        if (!previousCells || previousCells.length === 0) {
            // First time seeing this player, just store the state
            this.previousCellStates[playerId] = this.cloneCellStates(newCells);
            return;
        }

        // If cell count decreased, cells merged
        if (newCells.length < previousCells.length) {
            // Find which cells grew (received mass from merged cells)
            for (let i = 0; i < newCells.length; i++) {
                const newCell = newCells[i];

                if (!newCell || typeof newCell.x !== 'number' || typeof newCell.y !== 'number') {
                    continue; // Skip invalid cells
                }

                // Find all nearby previous cells (potential merge candidates)
                const nearbyCells = this.findNearbyCells(newCell, previousCells, 200);

                if (nearbyCells && nearbyCells.length > 0) {
                    // Use the largest nearby cell's radius as the starting point
                    const largestPrevCell = nearbyCells.reduce((max, cell) =>
                        (cell && cell.radius > max.radius) ? cell : max
                    );

                    if (largestPrevCell && newCell.mass > largestPrevCell.mass * 1.2) {
                        // Mass increased significantly, this cell absorbed another
                        // Start animation from the largest cell's radius to new radius
                        this.startAnimation(playerId, i, largestPrevCell.radius, newCell.radius);
                    }
                }
            }
        } else if (newCells.length === previousCells.length) {
            // Same number of cells, check if any grew significantly
            for (let i = 0; i < newCells.length; i++) {
                const newCell = newCells[i];
                const matchedPrevCell = this.findMatchingCell(newCell, previousCells);

                if (matchedPrevCell && newCell.mass > matchedPrevCell.mass * 1.2) {
                    // Mass increased significantly (ate something big or merged)
                    this.startAnimation(playerId, i, matchedPrevCell.radius, newCell.radius);
                }
            }
        }

        // Update stored state
        this.previousCellStates[playerId] = this.cloneCellStates(newCells);
    }

    // Find matching cell in previous state by proximity
    findMatchingCell(cell, previousCells) {
        let closestCell = null;
        let closestDistance = Infinity;

        for (let i = 0; i < previousCells.length; i++) {
            const prevCell = previousCells[i];
            const dx = cell.x - prevCell.x;
            const dy = cell.y - prevCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Cell should be relatively close (within 200 units)
            if (distance < 200 && distance < closestDistance) {
                closestDistance = distance;
                closestCell = prevCell;
            }
        }

        return closestCell;
    }

    // Find all nearby cells within a given distance
    findNearbyCells(cell, previousCells, maxDistance) {
        const nearbyCells = [];

        if (!cell || !previousCells || !Array.isArray(previousCells)) {
            return nearbyCells;
        }

        for (let i = 0; i < previousCells.length; i++) {
            const prevCell = previousCells[i];
            if (!prevCell || typeof prevCell.x !== 'number' || typeof prevCell.y !== 'number') {
                continue;
            }

            const dx = cell.x - prevCell.x;
            const dy = cell.y - prevCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < maxDistance) {
                nearbyCells.push(prevCell);
            }
        }

        return nearbyCells;
    }

    // Clone cell states for comparison
    cloneCellStates(cells) {
        const cloned = [];
        if (!cells || !Array.isArray(cells)) {
            return cloned;
        }

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell && typeof cell.x === 'number' && typeof cell.y === 'number' &&
                typeof cell.mass === 'number' && typeof cell.radius === 'number') {
                cloned.push({
                    x: cell.x,
                    y: cell.y,
                    mass: cell.mass,
                    radius: cell.radius
                });
            }
        }
        return cloned;
    }

    // Clean up old player states
    cleanupDisconnectedPlayers(activePlayerIds) {
        for (const playerId in this.previousCellStates) {
            if (!activePlayerIds[playerId]) {
                delete this.previousCellStates[playerId];
            }
        }

        // Also clean up animations for disconnected players
        for (const key in this.animations) {
            const playerId = key.split('_')[0];
            if (!activePlayerIds[playerId]) {
                delete this.animations[key];
            }
        }
    }

    // Reset all animations and states
    reset() {
        this.animations = {};
        this.previousCellStates = {};
    }
}

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

// Create cell animations instance after getTime is available
var cellAnimations = new CellAnimations();

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
            if (positionUpdateTimes.length > 0) {
                positionUpdateTimes = [];
                lastPositionUpdateTime = 0;
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

    // Calculate position update rate (UPS - Updates Per Second)
    if (positionUpdateTimes.length > 0) {
        var avgUpdateTime =
            positionUpdateTimes.reduce((sum, time) => sum + time, 0) /
            positionUpdateTimes.length;
        var ups = Math.round(1000 / avgUpdateTime);

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
        // Client-side prediction: extrapolate positions forward based on velocity
        if (prediction.enabled) {
            var now = getTime();
            var timeSinceUpdate = now - prediction.current.timestamp;

            // Limit extrapolation to reasonable time (prevent overshooting if network lags)
            var maxExtrapolation = 50; // ms - about 3 frames at 60fps
            timeSinceUpdate = Math.min(timeSinceUpdate, maxExtrapolation);

            // Only extrapolate if timeSinceUpdate is positive and reasonable
            if (timeSinceUpdate >= 0 && timeSinceUpdate <= maxExtrapolation) {
                // Extrapolate player camera position
                prediction.predicted.x = prediction.current.x + prediction.velocity.x * timeSinceUpdate;
                prediction.predicted.y = prediction.current.y + prediction.velocity.y * timeSinceUpdate;

                // Extrapolate cell positions
                if (prediction.cellVelocities.length === prediction.current.cells.length) {
                    prediction.predicted.cells = [];
                    for (var i = 0; i < prediction.current.cells.length; i++) {
                        var cell = prediction.current.cells[i];
                        var vel = prediction.cellVelocities[i];
                        prediction.predicted.cells.push({
                            x: cell.x + vel.vx * timeSinceUpdate,
                            y: cell.y + vel.vy * timeSinceUpdate,
                            mass: cell.mass,
                            radius: cell.radius,
                            score: cell.score
                        });
                    }
                } else {
                    // No velocity data (split/merge just happened) - use current state (using optimized cloning)
                    prediction.predicted.cells = cloneCells(prediction.current.cells);
                }
            } else {
                // Invalid time delta - use current state without extrapolation (using optimized cloning)
                prediction.predicted.x = prediction.current.x;
                prediction.predicted.y = prediction.current.y;
                prediction.predicted.cells = cloneCells(prediction.current.cells);
            }

            // Use predicted state for rendering
            player.x = prediction.predicted.x;
            player.y = prediction.predicted.y;
            player.cells = prediction.predicted.cells;

            // Apply smooth camera interpolation to prevent jarring jumps
            if (smoothCamera.enabled) {
                // Lerp camera position towards actual player position
                smoothCamera.x += (player.x - smoothCamera.x) * smoothCamera.lerpSpeed;
                smoothCamera.y += (player.y - smoothCamera.y) * smoothCamera.lerpSpeed;

                // Override player position with smooth camera for rendering
                player.x = smoothCamera.x;
                player.y = smoothCamera.y;
            }

            // Also update predicted cells in users array (for cell rendering)
            for (var i = 0; i < users.length; i++) {
                if (users[i].id === player.id) {
                    // Found current player in users array - replace with predicted cells
                    users[i].cells = prediction.predicted.cells;
                } else {
                    // Other player - extrapolate their cells too
                    var playerId = users[i].id;
                    var playerState = prediction.otherPlayers.states[playerId];

                    if (playerState && playerState.velocities.length > 0) {
                        var timeSinceUpdate = now - playerState.current.timestamp;

                        // Only extrapolate if time is valid
                        if (timeSinceUpdate >= 0 && timeSinceUpdate <= maxExtrapolation) {
                            timeSinceUpdate = Math.min(timeSinceUpdate, maxExtrapolation);

                            if (playerState.velocities.length === playerState.current.cells.length) {
                                var predictedCells = [];
                                for (var j = 0; j < playerState.current.cells.length; j++) {
                                    var cell = playerState.current.cells[j];
                                    var vel = playerState.velocities[j];
                                    predictedCells.push({
                                        x: cell.x + vel.vx * timeSinceUpdate,
                                        y: cell.y + vel.vy * timeSinceUpdate,
                                        mass: cell.mass,
                                        radius: cell.radius,
                                        score: cell.score
                                    });
                                }
                                users[i].cells = predictedCells;
                            }
                        }
                    }
                }
            }
        }

        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);

        // Only draw grid if user preference allows it
        if (global.showGrid) {
            render.drawGrid(global, player, global.screen, graph);
        }

        // Client-side viewport culling for food
        foods.forEach((food) => {
            // Inline position calculation to avoid object allocation (GC pressure reduction)
            let posX = food.x - player.x + global.screen.width / 2;
            let posY = food.y - player.y + global.screen.height / 2;
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
            let posX = fireFood.x - player.x + global.screen.width / 2;
            let posY = fireFood.y - player.y + global.screen.height / 2;
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
            let posX = virus.x - player.x + global.screen.width / 2;
            let posY = virus.y - player.y + global.screen.height / 2;
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
            left: global.screen.width / 2 - player.x,
            right: global.screen.width / 2 + global.game.width - player.x,
            top: global.screen.height / 2 - player.y,
            bottom: global.screen.height / 2 + global.game.height - player.y,
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
                    users[i].cells[j].x - player.x + global.screen.width / 2;
                let screenY =
                    users[i].cells[j].y - player.y + global.screen.height / 2;

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
            socket.emit("0", window.canvas.target); // playerSendTarget "Heartbeat".
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
var exitCountdownTimer = null;
var exitCountdownValue = 4;
var exitCountdownActive = false;

function exitGame() {
    // Start countdown
    exitCountdownActive = true;
    exitCountdownValue = 4;

    // Start countdown timer
    exitCountdownTimer = setInterval(function () {
        exitCountdownValue--;

        if (exitCountdownValue <= 0) {
            clearInterval(exitCountdownTimer);
            exitCountdownTimer = null;
            exitCountdownActive = false;

            // Play end of game sound for successful exit
            if (global.soundEnabled) {
                try {
                    const endGameSound = document.getElementById('end_of_game_sound');
                    if (endGameSound) {
                        endGameSound.volume = 0.6; // Moderate volume for ending
                        endGameSound.currentTime = 0;
                        endGameSound.play().catch(function(e) {
                            console.log('End of game sound playback failed:', e);
                        });
                    }
                } catch (e) {
                    console.log('End of game sound not available:', e);
                }
            }

            // Cleanup and return to landing page
            cleanupGame();
            returnToLanding();
        }
    }, 1000);
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

    // Reset client-side prediction
    prediction = {
        enabled: false,
        previous: { x: 0, y: 0, cells: [], timestamp: 0 },
        current: { x: 0, y: 0, cells: [], timestamp: 0 },
        predicted: { x: 0, y: 0, cells: [] },
        velocity: { x: 0, y: 0 },
        cellVelocities: [],
        otherPlayers: {
            states: {},
            timestamp: 0
        }
    };

    // Reset smooth camera
    smoothCamera = {
        enabled: false,
        x: 0,
        y: 0,
        lerpSpeed: 0.15
    };

    // Reset cell animations
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

function returnToLanding() {
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

        // Reset player name input if needed
        playerNameInput.value = "";
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
    // Check if ESC key is pressed and game is active
    if (event.key === "Escape" && global.gameStart) {
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

// Export functions to global scope for landing page integration
window.startGame = startGame;
