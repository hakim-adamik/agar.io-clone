const FULL_ANGLE = 2 * Math.PI;

const drawRoundObject = (position, radius, graph) => {
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fill();
    graph.stroke();
};

const drawFood = (position, food, graph) => {
    graph.fillStyle = "hsl(" + food.hue + ", 100%, 50%)";
    graph.strokeStyle = "hsl(" + food.hue + ", 100%, 45%)";
    graph.lineWidth = 0;
    drawRoundObject(position, food.radius, graph);
};

const drawVirus = (position, virus, graph) => {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth;
    let sides = 100; // More sides = more spikes (50 spikes total)
    let spikeDepth = 0.92; // Spike inward depth (0.92 = 8% inward, shorter spikes)

    graph.beginPath();
    for (let i = 0; i < sides; i++) {
        let theta = (i * FULL_ANGLE) / sides;
        // Alternate between outer radius (spike out) and inner radius (spike in)
        let radius = i % 2 === 0 ? virus.radius : virus.radius * spikeDepth;
        let point = circlePoint(position, radius, theta);
        if (i === 0) {
            graph.moveTo(point.x, point.y);
        } else {
            graph.lineTo(point.x, point.y);
        }
    }
    graph.closePath();
    graph.stroke();
    graph.fill();
};

const drawFireFood = (position, mass, playerConfig, graph) => {
    graph.strokeStyle = "hsl(" + mass.hue + ", 100%, 45%)";
    graph.fillStyle = "hsl(" + mass.hue + ", 100%, 50%)";
    graph.lineWidth = playerConfig.border + 2;
    drawRoundObject(position, mass.radius - 1, graph);
};

const valueInRange = (min, max, value) => Math.min(max, Math.max(min, value));

const circlePoint = (origo, radius, theta) => ({
    x: origo.x + radius * Math.cos(theta),
    y: origo.y + radius * Math.sin(theta),
});

const cellTouchingBorders = (cell, borders) =>
    cell.x - cell.radius <= borders.left ||
    cell.x + cell.radius >= borders.right ||
    cell.y - cell.radius <= borders.top ||
    cell.y + cell.radius >= borders.bottom;

const regulatePoint = (point, borders) => ({
    x: valueInRange(borders.left, borders.right, point.x),
    y: valueInRange(borders.top, borders.bottom, point.y),
});

// Optimized cell border drawing with reduced point count for smaller cells
const drawCellWithLines = (cell, borders, graph) => {
    // Use fewer points for smaller cells to improve performance
    const basePointCount = 20;
    const massFactor = Math.min(cell.mass / 10, 10); // Cap the mass factor
    let pointCount = Math.min(basePointCount + ~~massFactor, 40); // Cap at 40 points max

    // Pre-allocate array for better performance
    let points = new Array(pointCount);
    const thetaStep = FULL_ANGLE / pointCount;

    for (let i = 0; i < pointCount; i++) {
        let theta = i * thetaStep;
        let point = circlePoint(cell, cell.radius, theta);
        points[i] = regulatePoint(point, borders);
    }

    graph.beginPath();
    graph.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < pointCount; i++) {
        graph.lineTo(points[i].x, points[i].y);
    }
    graph.closePath();
    graph.fill();
    graph.stroke();
};

const drawCells = (cells, playerConfig, toggleMassState, borders, graph, exitCountdownActive, exitCountdownValue, player) => {
    for (let cell of cells) {
        // Draw the cell itself
        graph.fillStyle = cell.color;
        graph.strokeStyle = cell.borderColor;
        graph.lineWidth = 6;
        if (cellTouchingBorders(cell, borders)) {
            // Asssemble the cell from lines
            drawCellWithLines(cell, borders, graph);
        } else {
            // Border corrections are not needed, the cell can be drawn as a circle
            drawRoundObject(cell, cell.radius, graph);
        }

        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = "round";
        graph.textAlign = "center";
        graph.textBaseline = "middle";

        // Draw countdown instead of name/mass for player's cells when countdown is active
        if (exitCountdownActive && cell.isCurrentPlayer) {
            // Draw countdown number at cell center with pulsating animation
            let baseFontSize = Math.max(cell.radius / 3, 12);

            // Create pulsating effect using sine wave based on current time
            let time = Date.now() / 1000; // Convert to seconds
            let pulseScale = 1 + Math.sin(time * Math.PI * 2) * 0.3; // Oscillate between 0.7 and 1.3
            let fontSize = baseFontSize * pulseScale;

            graph.font = "bold " + Math.round(fontSize) + "px sans-serif";
            graph.strokeText(`${exitCountdownValue} !`, cell.x, cell.y);
            graph.fillText(`${exitCountdownValue} !`, cell.x, cell.y);
        } else {
            // Draw the name of the player
            let fontSize = Math.max(cell.radius / 3, 12);
            graph.font = "bold " + fontSize + "px sans-serif";
            graph.strokeText(cell.name, cell.x, cell.y);
            graph.fillText(cell.name, cell.x, cell.y);

            // Draw the score and mass (if enabled)
            if (toggleMassState === 1) {
                graph.font =
                    "bold " + Math.max((fontSize / 3) * 2, 10) + "px sans-serif";
                var smallFontSize = Math.max((fontSize / 3) * 2, 10);
                if (cell.name.length === 0) fontSize = 0;

                var score = cell.score !== undefined ? cell.score : 0;
                // Round to 2 decimals for display, remove trailing zeros
                var displayScore = parseFloat(score.toFixed(2));

                graph.strokeText(displayScore, cell.x, cell.y + fontSize);
                graph.fillText(displayScore, cell.x, cell.y + fontSize);
            }
        }
    }
};

// Cache grid drawing to improve performance
let gridCache = {
    canvas: null,
    playerX: null,
    playerY: null,
    screenWidth: null,
    screenHeight: null,
    gridSize: null,
};

const drawGrid = (global, player, screen, graph) => {
    // Don't draw grid if disabled by user preference
    if (!global.showGrid) {
        return;
    }

    const gridSize = screen.height / 18;

    // Ensure player position is valid (handle undefined/null/NaN)
    const playerX = player.x !== undefined && !isNaN(player.x) ? player.x : 0;
    const playerY = player.y !== undefined && !isNaN(player.y) ? player.y : 0;

    // Calculate how much the grid should be offset on screen
    // Following the same transformation as getPosition(): screenPos = worldPos - playerPos + screenCenter
    // For a grid line at world position 0, its screen position would be: 0 - playerX + screen.width/2
    // We want to find the offset for the nearest grid line
    const gridOffsetX = ((-playerX + screen.width / 2) % gridSize + gridSize) % gridSize;
    const gridOffsetY = ((-playerY + screen.height / 2) % gridSize + gridSize) % gridSize;

    // Check if we need to redraw the grid (only if offset changed significantly or screen changed)
    const shouldRedraw =
        !gridCache.canvas ||
        Math.abs((gridCache.playerX || 0) - playerX) > 1 ||
        Math.abs((gridCache.playerY || 0) - playerY) > 1 ||
        gridCache.screenWidth !== screen.width ||
        gridCache.screenHeight !== screen.height ||
        gridCache.gridSize !== gridSize;

    if (shouldRedraw) {
        // Create or reuse off-screen canvas for grid
        if (
            !gridCache.canvas ||
            gridCache.canvas.width !== screen.width ||
            gridCache.canvas.height !== screen.height
        ) {
            gridCache.canvas = document.createElement("canvas");
            gridCache.canvas.width = screen.width;
            gridCache.canvas.height = screen.height;
        }

        const cacheCtx = gridCache.canvas.getContext("2d");
        cacheCtx.clearRect(0, 0, screen.width, screen.height);
        cacheCtx.lineWidth = 1;
        cacheCtx.strokeStyle = global.lineColor;
        cacheCtx.globalAlpha = 0.15;
        cacheCtx.beginPath();

        // Start drawing from the first visible grid line
        // gridOffsetX/Y represents where the first grid line should appear on screen

        // Draw vertical lines
        for (let x = gridOffsetX; x <= screen.width; x += gridSize) {
            cacheCtx.moveTo(x, 0);
            cacheCtx.lineTo(x, screen.height);
        }
        // Handle the case where gridOffsetX > 0 (need to draw a line on the left)
        if (gridOffsetX > 0) {
            const x = gridOffsetX - gridSize;
            cacheCtx.moveTo(x, 0);
            cacheCtx.lineTo(x, screen.height);
        }

        // Draw horizontal lines
        for (let y = gridOffsetY; y <= screen.height; y += gridSize) {
            cacheCtx.moveTo(0, y);
            cacheCtx.lineTo(screen.width, y);
        }
        // Handle the case where gridOffsetY > 0 (need to draw a line on the top)
        if (gridOffsetY > 0) {
            const y = gridOffsetY - gridSize;
            cacheCtx.moveTo(0, y);
            cacheCtx.lineTo(screen.width, y);
        }

        cacheCtx.stroke();
        cacheCtx.globalAlpha = 1;

        // Update cache metadata
        gridCache.playerX = playerX;
        gridCache.playerY = playerY;
        gridCache.screenWidth = screen.width;
        gridCache.screenHeight = screen.height;
        gridCache.gridSize = gridSize;
    }

    // Draw cached grid
    if (gridCache.canvas) {
        graph.globalAlpha = 1;
        graph.drawImage(gridCache.canvas, 0, 0);
    }
};

const drawBorder = (borders, graph) => {
    graph.lineWidth = 1;
    graph.strokeStyle = "#000000";
    graph.beginPath();
    graph.moveTo(borders.left, borders.top);
    graph.lineTo(borders.right, borders.top);
    graph.lineTo(borders.right, borders.bottom);
    graph.lineTo(borders.left, borders.bottom);
    graph.closePath();
    graph.stroke();
};

const drawErrorMessage = (message, graph, screen) => {
    graph.fillStyle = "#333333";
    graph.fillRect(0, 0, screen.width, screen.height);
    graph.textAlign = "center";
    graph.fillStyle = "#FFFFFF";
    graph.font = "bold 30px sans-serif";
    graph.fillText(message, screen.width / 2, screen.height / 2);
};

module.exports = {
    drawFood,
    drawVirus,
    drawFireFood,
    drawCells,
    drawErrorMessage,
    drawGrid,
    drawBorder,
};
