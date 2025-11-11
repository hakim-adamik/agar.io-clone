/*jslint node: true */
'use strict';

const pool = require('../sql');
const DEFAULT_PREFERENCES = require('../../shared/default-preferences');

class PreferencesRepository {
    /**
     * Get user preferences (creates default if doesn't exist)
     */
    static async getPreferences(userId) {
        try {
            let result = await pool.query(
                'SELECT * FROM user_preferences WHERE user_id = $1',
                [userId]
            );
            let prefs = result.rows[0];

            if (!prefs) {
                // Create default preferences
                await this.createDefaultPreferences(userId);
                result = await pool.query(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [userId]
                );
                prefs = result.rows[0];
            }

            return prefs;
        } catch (err) {
            console.error('Error getting preferences:', err);
            throw err;
        }
    }

    /**
     * Create default preferences for a new user using game defaults
     */
    static async createDefaultPreferences(userId) {
        try {
            // PostgreSQL handles boolean values natively
            await pool.query(
                `INSERT INTO user_preferences (user_id, dark_mode, show_mass, show_border,
                 show_fps, show_grid, continuity, round_food, skin_id, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9)`,
                [
                    userId,
                    DEFAULT_PREFERENCES.darkMode,
                    DEFAULT_PREFERENCES.showMass,
                    DEFAULT_PREFERENCES.showBorder,
                    DEFAULT_PREFERENCES.showFps,
                    DEFAULT_PREFERENCES.showGrid,
                    DEFAULT_PREFERENCES.continuity,
                    DEFAULT_PREFERENCES.roundFood,
                    Date.now()
                ]
            );
            console.log(`[PREFERENCES] Created default preferences for user ${userId} using game defaults`);
            return true;
        } catch (err) {
            console.error('Error creating default preferences:', err);
            throw err;
        }
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(userId, preferences) {
        try {
            const allowedFields = [
                'dark_mode', 'show_mass', 'show_border', 'show_fps',
                'show_grid', 'continuity', 'round_food', 'skin_id'
            ];

            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            for (const field of allowedFields) {
                if (preferences[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex++}`);
                    // PostgreSQL handles boolean values natively
                    values.push(preferences[field]);
                }
            }

            if (updateFields.length === 0) {
                return true;
            }

            // Add updated_at
            updateFields.push(`updated_at = $${paramIndex++}`);
            values.push(Date.now());

            // Add user_id for WHERE clause
            values.push(userId);

            // First ensure preferences exist
            await this.getPreferences(userId);

            await pool.query(
                `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
                values
            );
            return true;
        } catch (err) {
            console.error('Error updating preferences:', err);
            throw err;
        }
    }

    /**
     * Reset preferences to defaults using shared configuration
     */
    static async resetToDefaults(userId) {
        try {
            // PostgreSQL handles boolean values natively
            await pool.query(
                `UPDATE user_preferences SET
                 dark_mode = $1, show_mass = $2, show_border = $3, show_fps = $4,
                 show_grid = $5, continuity = $6, round_food = $7, skin_id = NULL,
                 updated_at = $8
                 WHERE user_id = $9`,
                [
                    DEFAULT_PREFERENCES.darkMode,
                    DEFAULT_PREFERENCES.showMass,
                    DEFAULT_PREFERENCES.showBorder,
                    DEFAULT_PREFERENCES.showFps,
                    DEFAULT_PREFERENCES.showGrid,
                    DEFAULT_PREFERENCES.continuity,
                    DEFAULT_PREFERENCES.roundFood,
                    Date.now(),
                    userId
                ]
            );
            console.log(`[PREFERENCES] Reset preferences to defaults for user ${userId}`);
            return true;
        } catch (err) {
            console.error('Error resetting preferences:', err);
            throw err;
        }
    }
}

module.exports = PreferencesRepository;