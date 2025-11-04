var io = require("socket.io-client");
var render = require("./render");
var ChatClient = require("./chat-client");
var Canvas = require("./canvas");
var global = require("./global");

var playerNameInput = document.getElementById("playerNameInput");
var socket;

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
    // Ensure chat/settings is initialized first
    if (!window.chat) {
        window.chat = new ChatClient();
    }
    var settings = window.chat;

    var config = window.gameConfig || {};
    var defaults = config.getSettings ? config.getSettings() : {};

    // Apply each default setting if defined
    if (defaults.darkMode !== undefined) {
        var shouldEnable = defaults.darkMode;
        var isEnabled = global.backgroundColor === "#181818";
        if (shouldEnable !== isEnabled) {
            settings.toggleDarkMode();
        }
    }

    if (defaults.showMass !== undefined) {
        var shouldShow = defaults.showMass;
        var isShowing = global.toggleMassState === 1;
        if (shouldShow !== isShowing) {
            settings.toggleMass();
        }
    }

    if (defaults.showBorder !== undefined) {
        var shouldShow = defaults.showBorder;
        if (shouldShow !== global.borderDraw) {
            settings.toggleBorder();
        }
    }

    if (defaults.continuity !== undefined) {
        var shouldEnable = defaults.continuity;
        if (shouldEnable !== global.continuity) {
            settings.toggleContinuity();
        }
    }

    if (defaults.showFps !== undefined) {
        var shouldShow = defaults.showFps;
        if (shouldShow !== global.showFpsCounter) {
            settings.toggleFpsDisplay();
        }
    }

    // Sync checkbox states
    syncSettingsCheckboxes();
}

// Sync all settings checkboxes with current global state
function syncSettingsCheckboxes() {
    var checkboxSync = [
        {
            ids: ["darkMode", "darkModeGame"],
            value: global.backgroundColor === "#181818",
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
    } else {
        // Fallback for old flow
        document.getElementById("startMenuWrapper").style.maxHeight = "0px";
        document.getElementById("gameAreaWrapper").style.opacity = 1;
    }

    if (!socket) {
        socket = io({ query: "type=" + type });
        setupSocket(socket);
    }
    if (!global.animLoopHandle) animloop();
    socket.emit("respawn");
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug("Regex Test", regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

// Remove landing page code - handled by landing.js
/*
var modalTemplates = {
    social: {
        title: '<i class="fab fa-discord"></i> Social',
        content: `
            <div class="social-links" style="display: grid; gap: 1rem; margin-top: 1.5rem; padding-top: 0.5rem;">
                <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fab fa-discord" style="font-size: 1.5rem; color: #7289da; width: 40px;"></i>
                    <span>Join our Discord Server</span>
                </a>
                <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fab fa-telegram" style="font-size: 1.5rem; color: #0088cc; width: 40px;"></i>
                    <span>Telegram Community</span>
                </a>
                <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fa-brands fa-x-twitter" style="font-size: 1.5rem; color: white; width: 40px;"></i>
                    <span>Follow on X</span>
                </a>
                <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <i class="fab fa-youtube" style="font-size: 1.5rem; color: #ff0000; width: 40px;"></i>
                    <span>YouTube Channel</span>
                </a>
            </div>
        `
    },
    support: {
        title: 'Support Center',
        useGrid: true,
        items: [
            { icon: 'fas fa-book', title: 'Game Guide', desc: 'Browse comprehensive guides and tutorials' },
            { icon: 'fas fa-question-circle', title: 'FAQ', desc: 'Find answers to frequently asked questions' },
            { icon: 'fab fa-discord', title: 'Community', desc: 'Get help from our amazing player community' },
            { icon: 'fas fa-bug', title: 'Report Bug', desc: 'Help us improve by reporting issues' }
        ]
    },
    leaders: {
        title: '<i class="fas fa-trophy"></i> Leaderboard',
        content: `
            <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0;">
                <button class="tab-btn active" style="padding: 0.5rem 1rem; background: var(--primary-green, #84cc16); color: white; border: none; border-radius: 20px; cursor: pointer;">Today</button>
                <button class="tab-btn" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary, #94a3b8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">This Week</button>
                <button class="tab-btn" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary, #94a3b8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">All Time</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 10px;">
                    <span style="font-weight: bold; font-size: 1.4rem; color: gold; width: 40px; text-align: center;">1</span>
                    <span style="flex: 1; margin-left: 1rem;">ChampionPlayer</span>
                    <span style="font-weight: bold; color: var(--primary-green, #84cc16);">52,450</span>
                </div>
                <div style="display: flex; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.1)); border: 1px solid rgba(192, 192, 192, 0.5); border-radius: 10px;">
                    <span style="font-weight: bold; font-size: 1.3rem; color: silver; width: 40px; text-align: center;">2</span>
                    <span style="flex: 1; margin-left: 1rem;">ProGamer2024</span>
                    <span style="font-weight: bold; color: var(--primary-green, #84cc16);">48,320</span>
                </div>
            </div>
        `
    },
    profile: {
        title: '<i class="fas fa-user-circle"></i> Player Profile',
        content: `
            <div style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 10px; margin: 1.5rem 0; display: flex; align-items: center; gap: 1.5rem;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h3 style="margin-bottom: 0.25rem;">Guest Player</h3>
                    <p style="color: var(--text-secondary, #94a3b8); font-size: 0.9rem;">Not logged in</p>
                </div>
            </div>
            <div style="text-align: center; padding: 2rem; margin: 2rem 0;">
                <i class="fas fa-lock" style="font-size: 3rem; color: var(--text-secondary, #94a3b8); margin-bottom: 1rem; display: block;"></i>
                <p style="color: var(--text-secondary, #94a3b8); margin-bottom: 1.5rem; font-size: 1rem;">Sign in to track your progress and compete on the leaderboard!</p>
                <button class="modal-button" style="padding: 0.75rem 2rem; font-size: 1rem;">Sign In / Register</button>
            </div>
        `
    }
};

function initLandingPage() {
    // Play button - instant game start
    var playBtn = document.getElementById("playBtn");
    if (playBtn) {
        playBtn.onclick = function() {
            playerNameInput.value = generateGuestName();
            startGame("player");
        };
    }

    // How to play button
    var howToPlayBtn = document.getElementById("howToPlayBtn");
    if (howToPlayBtn) {
        howToPlayBtn.onclick = function() {
            showModal("tutorialModal");
        };
    }

    // Start from tutorial
    var startFromTutorial = document.getElementById("startFromTutorial");
    if (startFromTutorial) {
        startFromTutorial.onclick = function() {
            closeModal(document.getElementById("tutorialModal"));
            playerNameInput.value = generateGuestName();
            startGame("player");
        };
    }

    // Navigation items
    var navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(function(item) {
        item.addEventListener("click", function() {
            var section = this.dataset.section;

            // Update active state
            navItems.forEach(nav => nav.classList.remove("active"));
            this.classList.add("active");

            // Show modal content
            var template = modalTemplates[section];
            if (!template) return;

            var modal = document.getElementById("sectionModal");
            if (!modal) return;

            var modalContent = document.getElementById("modalContent");
            if (template.useGrid) {
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    <div class="tutorial-content">
                        ${template.items.map(item => `
                            <div class="tutorial-step">
                                <i class="${item.icon}"></i>
                                <h3>${item.title}</h3>
                                <p>${item.desc}</p>
                            </div>
                        `).join('')}
                    </div>
                    <button class="modal-button" onclick="closeModal(document.getElementById('sectionModal'))">Close</button>
                `;
            } else {
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    ${template.content}
                `;
            }

            showModal("sectionModal");
        });
    });

    // Initialize modal close buttons
    document.querySelectorAll(".modal").forEach(function(modal) {
        var closeBtn = modal.querySelector(".close-modal");
        if (closeBtn) {
            closeBtn.addEventListener("click", function() {
                closeModal(modal);
            });
        }
        modal.addEventListener("click", function(e) {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Initialize parallax effect
    initParallax();
}

function showModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.add("show");
}

function closeModal(modal) {
    modal.classList.remove("show");
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
}

function initParallax() {
    var mouseX = 0, mouseY = 0;
    var targetX = 0, targetY = 0;

    document.addEventListener("mousemove", function(e) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    });

    function animate() {
        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;

        var previewCells = document.querySelector(".preview-cells");
        if (previewCells) {
            previewCells.style.transform = `translate(${targetX}px, ${targetY}px)`;
        }
        requestAnimationFrame(animate);
    }
    animate();
}

*/

window.onload = function () {
    // Landing page is handled by landing.js

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

    // Game settings button (during gameplay)
    var gameSettingsBtn = document.getElementById("gameSettingsBtn");
    if (gameSettingsBtn) {
        gameSettingsBtn.onclick = function () {
            showModal("settingsModal");
        };
    }

    // Settings modal close button
    var closeSettingsBtn = document.querySelector(".close-settings");
    if (closeSettingsBtn) {
        closeSettingsBtn.onclick = function () {
            closeModal(document.getElementById("settingsModal"));
        };
    }

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
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var settings = window.chat; // Settings functions are in the chat client

var visibleBorderSetting = document.getElementById("visBord");
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById("showMass");
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById("continuity");
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById("roundFood");
roundFoodSetting.onchange = settings.toggleRoundFood;

var showFpsSetting = document.getElementById("showFps");
showFpsSetting.onchange = settings.toggleFpsDisplay;

var darkModeSetting = document.getElementById("darkMode");
darkModeSetting.onchange = settings.toggleDarkMode;

// Sync game settings modal checkboxes
var visBordGame = document.getElementById("visBordGame");
if (visBordGame) {
    visBordGame.onchange = function () {
        visibleBorderSetting.checked = this.checked;
        settings.toggleBorder();
    };
}

var showMassGame = document.getElementById("showMassGame");
if (showMassGame) {
    showMassGame.onchange = function () {
        showMassSetting.checked = this.checked;
        settings.toggleMass();
    };
}

var continuityGame = document.getElementById("continuityGame");
if (continuityGame) {
    continuityGame.onchange = function () {
        continuitySetting.checked = this.checked;
        settings.toggleContinuity();
    };
}

var roundFoodGame = document.getElementById("roundFoodGame");
if (roundFoodGame) {
    roundFoodGame.onchange = function () {
        roundFoodSetting.checked = this.checked;
        settings.toggleRoundFood();
    };
}

var darkModeGame = document.getElementById("darkModeGame");
if (darkModeGame) {
    darkModeGame.onchange = function () {
        darkModeSetting.checked = this.checked;
        settings.toggleDarkMode();
    };
}

var showFpsGame = document.getElementById("showFpsGame");
if (showFpsGame) {
    showFpsGame.onchange = function () {
        showFpsSetting.checked = this.checked;
        settings.toggleFpsDisplay();
    };
}

var c = window.canvas.cv;
var graph = c.getContext("2d");

$("#feed").click(function () {
    socket.emit("1");
    window.canvas.reenviar = false;
});

$("#split").click(function () {
    socket.emit("2");
    window.canvas.reenviar = false;
});

function handleDisconnect() {
    socket.close();
    if (!global.kicked) {
        // We have a more specific error message
        render.drawErrorMessage("Disconnected!", graph, global.screen);
    }
}

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on("pongcheck", function () {
        var latency = Date.now() - global.startPingTime;
        debug("Latency: " + latency + "ms");
        window.chat.addSystemLine("Ping: " + latency + "ms");
    });

    // Handle error.
    socket.on("connect_error", handleDisconnect);
    socket.on("disconnect", handleDisconnect);

    // Handle connection.
    socket.on("welcome", function (playerSettings, gameSizes) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;
        player.target = window.canvas.target;
        global.player = player;
        window.chat.player = player;
        socket.emit("gotit", player);
        global.gameStart = true;
        window.chat.addSystemLine("Connected to the game!");
        window.chat.addSystemLine("Type <b>-help</b> for a list of commands.");
        if (global.mobile) {
            document
                .getElementById("gameAreaWrapper")
                .removeChild(document.getElementById("chatbox"));
        }
        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();
    });

    socket.on("playerDied", (data) => {
        const player = isUnnamedCell(data.playerEatenName)
            ? "An unnamed cell"
            : data.playerEatenName;
        //const killer = isUnnamedCell(data.playerWhoAtePlayerName) ? 'An unnamed cell' : data.playerWhoAtePlayerName;

        //window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten by <b>' + (killer) + '</b>');
        window.chat.addSystemLine("{GAME} - <b>" + player + "</b> was eaten");
    });

    socket.on("playerDisconnect", (data) => {
        window.chat.addSystemLine(
            "{GAME} - <b>" +
                (isUnnamedCell(data.name) ? "An unnamed cell" : data.name) +
                "</b> disconnected."
        );
    });

    socket.on("playerJoin", (data) => {
        window.chat.addSystemLine(
            "{GAME} - <b>" +
                (isUnnamedCell(data.name) ? "An unnamed cell" : data.name) +
                "</b> joined."
        );
    });

    socket.on("leaderboard", (data) => {
        leaderboard = data.leaderboard;
        var status = '<span class="title">Leaderboard</span>';
        for (var i = 0; i < leaderboard.length; i++) {
            status += "<br />";
            if (leaderboard[i].id == player.id) {
                if (leaderboard[i].name.length !== 0)
                    status +=
                        '<span class="me">' +
                        (i + 1) +
                        ". " +
                        leaderboard[i].name +
                        "</span>";
                else
                    status +=
                        '<span class="me">' +
                        (i + 1) +
                        ". An unnamed cell</span>";
            } else {
                if (leaderboard[i].name.length !== 0)
                    status += i + 1 + ". " + leaderboard[i].name;
                else status += i + 1 + ". An unnamed cell";
            }
        }
        //status += '<br />Players: ' + data.players;
        document.getElementById("status").innerHTML = status;
    });

    socket.on("serverMSG", function (data) {
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on("serverSendPlayerChat", function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });

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
                player.x = playerData.x;
                player.y = playerData.y;
                player.hue = playerData.hue;
                player.massTotal = playerData.massTotal;
                player.cells = playerData.cells;
            }
            users = userData;
            foods = foodsList;
            viruses = virusList;
            fireFood = massList;
        }
    );

    // Death.
    socket.on("RIP", function () {
        global.gameStart = false;
        render.drawErrorMessage("You died!", graph, global.screen);
        window.setTimeout(() => {
            document.getElementById("gameAreaWrapper").style.opacity = 0;
            document.getElementById("startMenuWrapper").style.maxHeight =
                "1000px";
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
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
        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);

        render.drawGrid(global, player, global.screen, graph);

        // Client-side viewport culling for food
        foods.forEach((food) => {
            let position = getPosition(food, player, global.screen);
            if (
                isEntityVisible(
                    { x: position.x, y: position.y, radius: food.radius },
                    global.screen
                )
            ) {
                render.drawFood(position, food, graph);
            }
        });

        // Client-side viewport culling for fireFood
        fireFood.forEach((fireFood) => {
            let position = getPosition(fireFood, player, global.screen);
            if (
                isEntityVisible(
                    { x: position.x, y: position.y, radius: fireFood.radius },
                    global.screen
                )
            ) {
                render.drawFireFood(position, fireFood, playerConfig, graph);
            }
        });

        // Client-side viewport culling for viruses
        viruses.forEach((virus) => {
            let position = getPosition(virus, player, global.screen);
            if (
                isEntityVisible(
                    { x: position.x, y: position.y, radius: virus.radius },
                    global.screen
                )
            ) {
                render.drawVirus(position, virus, graph);
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

        var cellsToDraw = [];
        for (var i = 0; i < users.length; i++) {
            let color = "hsl(" + users[i].hue + ", 100%, 50%)";
            let borderColor = "hsl(" + users[i].hue + ", 100%, 45%)";
            for (var j = 0; j < users[i].cells.length; j++) {
                let screenX =
                    users[i].cells[j].x - player.x + global.screen.width / 2;
                let screenY =
                    users[i].cells[j].y - player.y + global.screen.height / 2;

                // Client-side viewport culling for cells
                if (
                    isEntityVisible(
                        {
                            x: screenX,
                            y: screenY,
                            radius: users[i].cells[j].radius,
                        },
                        global.screen
                    )
                ) {
                    cellsToDraw.push({
                        color: color,
                        borderColor: borderColor,
                        mass: users[i].cells[j].mass,
                        name: users[i].name,
                        radius: users[i].cells[j].radius,
                        x: screenX,
                        y: screenY,
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
            graph
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
    if (!socket) return;

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
