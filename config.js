module.exports = {
    host: "0.0.0.0",
    port: (typeof process !== 'undefined' && process.env && process.env.PORT) ? process.env.PORT : 3000,
    logpath: "logger.php",
    foodMass: 1,
    fireFood: 20,
    limitSplit: 16,
    defaultPlayerMass: 20,
    minSplitMass: 20,
    virus: {
        fill: "#33ff33",
        stroke: "#19D119",
        strokeWidth: 2,
        defaultMass: {
            from: 100,
            to: 150,
        },
        splitMass: 180,
        uniformDisposition: false,
    },
    gameWidth: 5000,
    gameHeight: 5000,
    adminPass: "DEFAULT",
    gameMass: 20000,
    maxFood: 1000,
    maxVirus: 50,
    slowBase: 20,
    networkUpdateFactor: 60,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "farthest", // Multi-arena supports farthest with max 10 players per arena

    // Multi-arena configuration
    multiArenaEnabled: true, // Enable multi-arena system
    maxPlayersPerArena: 10, // Player capacity per arena
    arenaCleanupTimeout: 60000, // Milliseconds before cleaning empty arenas (60 seconds)
    // FIXME Single arena for now to prevent performance issues
    maxTotalArenas: 1, // Maximum concurrent arenas (resource limit)

    // Waiting room configuration
    minPlayersToStart: 2, // Minimum players required to start an arena
    waitingRoomCountdown: 3000, // Countdown duration when minimum players reached (3 seconds)

    // Game economy configuration
    entryFee: 1.0, // Entry fee in dollars to join a game (0 = free to play)

    // Cell movement physics
    minSpeed: 6.5, // Base movement speed for cells (reduced from 6.25 to slow down convergence)
    splitCellSpeed: 15, // Initial speed when a cell splits
    speedDecrement: 0.5, // How quickly split speed decreases
    minDistance: 50, // Minimum distance from cursor where cells slow down
    pushingAwaySpeed: 1.5, // Speed at which overlapping cells push away from each other
    mergeOverlapThreshold: 0.85, // Cells must overlap by this fraction of their radius to merge (0.3 = 30% overlap required)
    cellInertia: 0.10, // How much inertia cells have (0-1, lower = more inertia/smoother turning, higher = sharper turns)
    splitControlDelay: 600, // Time in ms before split cells respond to cursor (maintains split momentum)

    massLossRate: 1,
    minMassLoss: 50,
    mergeTimeBase: 1000, // Base time in milliseconds before cells can merge after split
    mergeTimeRate: 10, // Time increase before merge, per unit of cell mass (mergeTime = base + mass * rate)

    // Client-side prediction configuration
    predictionEnabled: true,
    predictionMaxExtrapolation: 50, // ms - max time to predict ahead
    predictionMaxVelocity: 5, // pixels/ms - cap for sanity
    predictionMinTimeDelta: 5, // ms - ignore very small updates

    sqlinfo: {
        fileName: "db.sqlite3",
    },
};
