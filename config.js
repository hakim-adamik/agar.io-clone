module.exports = {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
    logpath: "logger.php",
    foodMass: 1,
    fireFood: 20,
    limitSplit: 16,
    //defaultPlayerMass: 10,
    // FIXME DEBUG TBR
    defaultPlayerMass: 100,
    minSplitMass: 10,
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
    slowBase: 10,
    networkUpdateFactor: 60,
    maxHeartbeatInterval: 5000,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "farthest", // Multi-arena supports farthest with max 10 players per arena

    // Multi-arena configuration
    multiArenaEnabled: true, // Enable multi-arena system
    maxPlayersPerArena: 10, // Player capacity per arena
    arenaCleanupTimeout: 60000, // Milliseconds before cleaning empty arenas (60 seconds)
    maxTotalArenas: 50, // Maximum concurrent arenas (resource limit)

    // Cell movement physics
    minSpeed: 6.5, // Base movement speed for cells (reduced from 6.25 to slow down convergence)
    splitCellSpeed: 20, // Initial speed when a cell splits
    speedDecrement: 0.5, // How quickly split speed decreases
    minDistance: 150, // Minimum distance from cursor where cells slow down
    pushingAwaySpeed: 1.1, // Speed at which overlapping cells push away from each other

    massLossRate: 1,
    minMassLoss: 50,
    mergeTimer: 700, // Time in milliseconds before cells can merge after they are fully separated (0 = immediate merge once separated)

    sqlinfo: {
        fileName: "db.sqlite3",
    },
};
