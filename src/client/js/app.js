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

function startGame(type) {
    global.playerName = playerNameInput.value
        .replace(/(<([^>]+)>)/gi, "")
        .substring(0, 25);
    global.playerType = type;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;

    document.getElementById("startMenuWrapper").style.maxHeight = "0px";
    document.getElementById("gameAreaWrapper").style.opacity = 1;
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

window.onload = function () {
    var btn = document.getElementById("startButton"),
        btnS = document.getElementById("spectateButton"),
        nickErrorText = document.querySelector("#startMenu .input-error");

    btnS.onclick = function () {
        startGame("spectator");
    };

    btn.onclick = function () {
        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.opacity = 0;
            startGame("player");
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    var settingsMenu = document.getElementById("settingsButton");
    var settings = document.getElementById("settings");

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == "300px") {
            settings.style.maxHeight = "0px";
        } else {
            settings.style.maxHeight = "300px";
        }
    };

    playerNameInput.addEventListener("keypress", function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame("player");
            } else {
                nickErrorText.style.opacity = 1;
            }
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
