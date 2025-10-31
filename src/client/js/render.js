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
    let theta = 0;
    let sides = 20;

    graph.beginPath();
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / sides) {
        let point = circlePoint(position, virus.radius, theta);
        graph.lineTo(point.x, point.y);
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

const drawCells = (cells, playerConfig, toggleMassState, borders, graph) => {
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

        // Draw the name of the player
        let fontSize = Math.max(cell.radius / 3, 12);
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = "round";
        graph.textAlign = "center";
        graph.textBaseline = "middle";
        graph.font = "bold " + fontSize + "px sans-serif";
        graph.strokeText(cell.name, cell.x, cell.y);
        graph.fillText(cell.name, cell.x, cell.y);

        // Draw the mass (if enabled)
        if (toggleMassState === 1) {
            graph.font =
                "bold " + Math.max((fontSize / 3) * 2, 10) + "px sans-serif";
            if (cell.name.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cell.mass), cell.x, cell.y + fontSize);
            graph.fillText(Math.round(cell.mass), cell.x, cell.y + fontSize);
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
    const gridSize = screen.height / 18;

    // Check if we need to redraw the grid (only if camera moved significantly or screen size changed)
    const shouldRedraw =
        !gridCache.canvas ||
        Math.abs(gridCache.playerX - player.x) > gridSize ||
        Math.abs(gridCache.playerY - player.y) > gridSize ||
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

        // Calculate visible grid lines more efficiently
        const startX = Math.floor(-player.x / gridSize) * gridSize;
        const startY = Math.floor(-player.y / gridSize) * gridSize;

        for (let x = startX; x < screen.width; x += gridSize) {
            cacheCtx.moveTo(x, 0);
            cacheCtx.lineTo(x, screen.height);
        }

        for (let y = startY; y < screen.height; y += gridSize) {
            cacheCtx.moveTo(0, y);
            cacheCtx.lineTo(screen.width, y);
        }

        cacheCtx.stroke();
        cacheCtx.globalAlpha = 1;

        // Update cache metadata
        gridCache.playerX = player.x;
        gridCache.playerY = player.y;
        gridCache.screenWidth = screen.width;
        gridCache.screenHeight = screen.height;
        gridCache.gridSize = gridSize;
    }

    // Draw cached grid
    graph.globalAlpha = 1;
    graph.drawImage(gridCache.canvas, 0, 0);
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
