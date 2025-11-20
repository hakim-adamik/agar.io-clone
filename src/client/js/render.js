const FULL_ANGLE = 2 * Math.PI;

// HSL color cache (shared with app.js via window)
var colorCache = window.colorCache || {};
window.colorCache = colorCache;

function getHSLColor(hue, lightness) {
    var key = hue + '_' + lightness;
    if (!colorCache[key]) {
        colorCache[key] = 'hsl(' + hue + ', 100%, ' + lightness + '%)';
    }
    return colorCache[key];
}

const drawRoundObject = (position, radius, graph) => {
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fill();
    // graph.stroke(); // Removed cell border
};

const drawFood = (position, food, graph) => {
    // Use cached colors instead of creating strings every frame
    graph.fillStyle = getHSLColor(food.hue, 50);
    graph.strokeStyle = getHSLColor(food.hue, 45);
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
    // Use cached colors instead of creating strings every frame
    graph.strokeStyle = getHSLColor(mass.hue, 45);
    graph.fillStyle = getHSLColor(mass.hue, 50);
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

// Pre-allocated points pool to reduce GC pressure (max 40 points)
const pointsPool = new Array(40);
for (let i = 0; i < 40; i++) {
    pointsPool[i] = { x: 0, y: 0 };
}

// Optimized cell border drawing with reduced point count for smaller cells
const drawCellWithLines = (cell, borders, graph) => {
    // Use fewer points for smaller cells to improve performance
    const basePointCount = 20;
    const massFactor = Math.min(cell.mass / 10, 10); // Cap the mass factor
    let pointCount = Math.min(basePointCount + ~~massFactor, 40); // Cap at 40 points max

    // Reuse pre-allocated points pool to reduce GC pressure
    const thetaStep = FULL_ANGLE / pointCount;

    for (let i = 0; i < pointCount; i++) {
        let theta = i * thetaStep;
        let point = circlePoint(cell, cell.radius, theta);
        let regulated = regulatePoint(point, borders);
        // Reuse pooled point object instead of creating new one
        pointsPool[i].x = regulated.x;
        pointsPool[i].y = regulated.y;
    }

    graph.beginPath();
    graph.moveTo(pointsPool[0].x, pointsPool[0].y);
    for (let i = 1; i < pointCount; i++) {
        graph.lineTo(pointsPool[i].x, pointsPool[i].y);
    }
    graph.closePath();
    graph.fill();
    // graph.stroke(); // Removed cell border
};

const drawCells = (cells, playerConfig, toggleMassState, borders, graph, exitCountdownActive, exitCountdownValue, player) => {
    for (let cell of cells) {
        // Draw the cell itself
        graph.fillStyle = cell.color;
        graph.strokeStyle = cell.borderColor;
        graph.lineWidth = 0;
        // Always draw cells as full circles
        // The server already prevents cells from moving beyond game boundaries
        // No need to visually clip them - they just stop at the border
        drawRoundObject(cell, cell.radius, graph);

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
                // Round to 4 decimals for display
                var displayScore = score.toFixed(4);

                graph.strokeText(displayScore, cell.x, cell.y + fontSize);
                graph.fillText(displayScore, cell.x, cell.y + fontSize);
            }
        }
    }
};

// Reusable canvas for grid drawing (created once to reduce GC pressure)
const drawGrid = (global, player, screen, graph, zoom = 1, effectiveWidth = null, effectiveHeight = null) => {
    // Don't draw grid if disabled by user preference
    if (!global.showGrid) {
        return;
    }

    const gridSize = screen.height / 18;

    // Ensure player position is valid (handle undefined/null/NaN)
    const playerX = player.x !== undefined && !isNaN(player.x) ? player.x : 0;
    const playerY = player.y !== undefined && !isNaN(player.y) ? player.y : 0;

    // The grid is drawn AFTER zoom transformation, so coordinates will be scaled
    // To fill the actual screen, we need to expand our drawing area by 1/zoom
    // After transformation: finalPos = (pos - center) * zoom + center
    // To reach screen edges, we need: pos = (finalPos - center) / zoom + center
    const expandedMinX = screen.width / 2 - (screen.width / 2) / zoom;
    const expandedMaxX = screen.width / 2 + (screen.width / 2) / zoom;
    const expandedMinY = screen.height / 2 - (screen.height / 2) / zoom;
    const expandedMaxY = screen.height / 2 + (screen.height / 2) / zoom;

    // Calculate which grid lines we need to draw to cover the expanded screen area
    // For vertical lines: screenX = worldX - playerX + screen.width / 2
    // We need: expandedMinX <= screenX <= expandedMaxX
    // So: worldX = screenX + playerX - screen.width / 2
    const worldMinX = expandedMinX + playerX - screen.width / 2;
    const worldMaxX = expandedMaxX + playerX - screen.width / 2;
    const worldMinY = expandedMinY + playerY - screen.height / 2;
    const worldMaxY = expandedMaxY + playerY - screen.height / 2;

    // Find the first grid line before the visible area
    const firstGridX = Math.floor(worldMinX / gridSize) * gridSize;
    const firstGridY = Math.floor(worldMinY / gridSize) * gridSize;

    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 0.15;
    graph.beginPath();

    // Draw vertical lines
    for (let worldX = firstGridX; worldX <= worldMaxX; worldX += gridSize) {
        // Transform to screen coordinates (same as food rendering)
        let screenX = worldX - playerX + screen.width / 2;
        graph.moveTo(screenX, expandedMinY);
        graph.lineTo(screenX, expandedMaxY);
    }

    // Draw horizontal lines
    for (let worldY = firstGridY; worldY <= worldMaxY; worldY += gridSize) {
        // Transform to screen coordinates (same as food rendering)
        let screenY = worldY - playerY + screen.height / 2;
        graph.moveTo(expandedMinX, screenY);
        graph.lineTo(expandedMaxX, screenY);
    }

    graph.stroke();
    graph.globalAlpha = 1;
};

const drawBorder = (borders, graph) => {
    graph.lineWidth = 8;
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
