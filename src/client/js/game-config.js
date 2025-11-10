// Centralized game configuration
// This uses the shared default preferences and can be overridden by user profile settings

window.gameConfig = {
    // Default settings for new players (from shared configuration)
    defaultSettings: window.DEFAULT_PREFERENCES || {
        // Fallback if shared config doesn't load
        darkMode: true,
        showMass: true,
        showBorder: true,
        showGrid: true,
        continuity: true,
        showFps: false,
        roundFood: true
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