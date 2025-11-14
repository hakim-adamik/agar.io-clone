/*jslint node: true */
'use strict';

/**
 * Default preferences for new users
 * This is the single source of truth for default game settings
 * Used by both client and server
 */
const DEFAULT_PREFERENCES = {
    darkMode: true,        // Enable dark theme by default
    showMass: true,        // Display cell mass values
    showBorder: true,      // Show game area borders
    showGrid: true,        // Show background grid
    continuity: true,      // Continue moving when mouse leaves screen
    showFps: false,        // Hide FPS counter for cleaner UI
    roundFood: true,       // Use round food particles (always true now)
    soundEnabled: true,    // Enable sound effects by default
    musicEnabled: true     // Enable background music by default
};

// Export for Node.js (server)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_PREFERENCES;
}

// Export for browser (client)
if (typeof window !== 'undefined') {
    window.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
}