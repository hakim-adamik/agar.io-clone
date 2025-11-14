/**
 * Settings Manager
 * Handles game settings, preferences, and their persistence
 */

var global = require("./global");

// Default settings configuration
const DEFAULT_SETTINGS = {
    darkMode: true,
    showMass: true,
    showBorder: true,
    continuity: true,
    showFps: false,
    roundFood: true,
    soundEnabled: true,
    musicEnabled: false,
    showGrid: true
};

/**
 * Load user preferences from the server
 */
exports.loadUserPreferences = async function(userId) {
    try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/user/${userId}/preferences`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const preferences = await response.json();
            console.log('[Settings] Loaded preferences from server:', preferences);
            applyPreferences(preferences);
            return preferences;
        } else {
            console.log('[Settings] Failed to load preferences, using defaults');
            applyDefaults();
            return DEFAULT_SETTINGS;
        }
    } catch (error) {
        console.error('[Settings] Error loading preferences:', error);
        applyDefaults();
        return DEFAULT_SETTINGS;
    }
};

/**
 * Save user preferences to the server
 */
exports.saveUserPreferences = async function(userId, preferences) {
    try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/user/${userId}/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        if (response.ok) {
            console.log('[Settings] Preferences saved successfully');
            return true;
        } else {
            console.error('[Settings] Failed to save preferences');
            return false;
        }
    } catch (error) {
        console.error('[Settings] Error saving preferences:', error);
        return false;
    }
};

/**
 * Apply default settings
 */
exports.applyDefaults = function() {
    applyPreferences(DEFAULT_SETTINGS);
};

/**
 * Apply preferences to the game
 */
function applyPreferences(prefs) {
    // Apply visual settings
    if (prefs.darkMode !== undefined) {
        global.backgroundColor = prefs.darkMode ? "#000000" : "#f2fbff";
        global.gridColor = prefs.darkMode ? "#222222" : "#d3d3d3";

        // Update dark mode checkbox if exists
        const darkModeCheckbox = document.getElementById("darkModeGame");
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = prefs.darkMode;
        }
    }

    if (prefs.showMass !== undefined) {
        global.showMass = prefs.showMass;
        const showMassCheckbox = document.getElementById("showMassGame");
        if (showMassCheckbox) {
            showMassCheckbox.checked = prefs.showMass;
        }
    }

    if (prefs.showBorder !== undefined) {
        global.borderDraw = prefs.showBorder;
        const visBordCheckbox = document.getElementById("visBordGame");
        if (visBordCheckbox) {
            visBordCheckbox.checked = prefs.showBorder;
        }
    }

    if (prefs.continuity !== undefined) {
        global.continuity = prefs.continuity;
        const continuityCheckbox = document.getElementById("continuityGame");
        if (continuityCheckbox) {
            continuityCheckbox.checked = prefs.continuity;
        }
    }

    if (prefs.showFps !== undefined) {
        global.showFps = prefs.showFps;
        const showFpsCheckbox = document.getElementById("showFpsGame");
        if (showFpsCheckbox) {
            showFpsCheckbox.checked = prefs.showFps;
        }

        // Toggle FPS counter visibility
        const fpsCounter = document.getElementById("fpsCounter");
        if (fpsCounter) {
            fpsCounter.style.display = prefs.showFps ? "block" : "none";
        }
    }

    if (prefs.roundFood !== undefined) {
        global.roundFood = prefs.roundFood;
        const roundFoodCheckbox = document.getElementById("roundFoodGame");
        if (roundFoodCheckbox) {
            roundFoodCheckbox.checked = prefs.roundFood;
        }
    }

    if (prefs.soundEnabled !== undefined) {
        global.soundEnabled = prefs.soundEnabled;
    }

    if (prefs.musicEnabled !== undefined) {
        global.musicEnabled = prefs.musicEnabled;
    }

    if (prefs.showGrid !== undefined) {
        global.gridShow = prefs.showGrid;
    }

    console.log('[Settings] Applied preferences:', prefs);
}

/**
 * Get the appropriate API URL based on the current environment
 */
function getApiUrl() {
    const currentPort = window.location.port;
    const currentProtocol = window.location.protocol;
    const currentHost = window.location.hostname;

    if (currentPort === '8080' || currentPort === '8000') {
        return `${currentProtocol}//${currentHost}:3000`;
    }

    return '';
}

/**
 * Toggle a specific setting
 */
exports.toggleSetting = function(settingName, value) {
    switch(settingName) {
        case 'darkMode':
            global.backgroundColor = value ? "#000000" : "#f2fbff";
            global.gridColor = value ? "#222222" : "#d3d3d3";
            break;
        case 'showMass':
            global.showMass = value;
            break;
        case 'showBorder':
            global.borderDraw = value;
            break;
        case 'continuity':
            global.continuity = value;
            break;
        case 'showFps':
            global.showFps = value;
            const fpsCounter = document.getElementById("fpsCounter");
            if (fpsCounter) {
                fpsCounter.style.display = value ? "block" : "none";
            }
            break;
        case 'roundFood':
            global.roundFood = value;
            break;
        case 'soundEnabled':
            global.soundEnabled = value;
            break;
        case 'musicEnabled':
            global.musicEnabled = value;
            break;
        case 'showGrid':
            global.gridShow = value;
            break;
    }
};

/**
 * Get current settings
 */
exports.getCurrentSettings = function() {
    return {
        darkMode: global.backgroundColor === "#000000",
        showMass: global.showMass,
        showBorder: global.borderDraw,
        continuity: global.continuity,
        showFps: global.showFps,
        roundFood: global.roundFood,
        soundEnabled: global.soundEnabled,
        musicEnabled: global.musicEnabled,
        showGrid: global.gridShow
    };
};