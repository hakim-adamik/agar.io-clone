// Centralized game configuration
// This can be overridden by user profile settings when implemented

window.gameConfig = {
    // Default settings for new players
    defaultSettings: {
        darkMode: true,        // Enable dark theme by default
        showMass: true,        // Display cell mass values
        showBorder: true,      // Show game area borders
        showGrid: true,        // Show background grid
        continuity: true,      // Continue moving when mouse leaves screen
        showFps: false,        // Hide FPS counter for cleaner UI
        roundFood: true        // Use round food particles
    },

    // Debug settings
    debug: {
        showCellMass: false    // Show mass debug display on cells (in addition to score)
    },

    // Future: User profile overrides will go here
    // userSettings: null,  // Will be populated from user profile

    // Get effective settings (defaults or user overrides)
    getSettings: function() {
        // In the future, this will merge user settings with defaults
        // return Object.assign({}, this.defaultSettings, this.userSettings || {});
        return this.defaultSettings;
    }
};