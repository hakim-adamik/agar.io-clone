/*jslint node: true */
'use strict';

const db = require('../sql').db;

class PreferencesRepository {
    /**
     * Get user preferences (creates default if doesn't exist)
     */
    static async getPreferences(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM user_preferences WHERE user_id = ?',
                [userId],
                async (err, prefs) => {
                    if (err) return reject(err);

                    if (!prefs) {
                        // Create default preferences
                        await this.createDefaultPreferences(userId);
                        db.get(
                            'SELECT * FROM user_preferences WHERE user_id = ?',
                            [userId],
                            (err2, newPrefs) => {
                                if (err2) return reject(err2);
                                resolve(newPrefs);
                            }
                        );
                    } else {
                        resolve(prefs);
                    }
                }
            );
        });
    }

    /**
     * Create default preferences for a new user
     */
    static async createDefaultPreferences(userId) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO user_preferences (user_id, dark_mode, show_mass, show_border,
                 show_fps, show_grid, continuity, round_food, skin_id, updated_at)
                 VALUES (?, 1, 1, 1, 0, 1, 1, 1, NULL, ?)`,
                [userId, Date.now()],
                (err) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(userId, preferences) {
        const allowedFields = [
            'dark_mode', 'show_mass', 'show_border', 'show_fps',
            'show_grid', 'continuity', 'round_food', 'skin_id'
        ];

        const updateFields = [];
        const values = [];

        for (const field of allowedFields) {
            if (preferences[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                // Convert boolean to integer for SQLite
                const value = typeof preferences[field] === 'boolean' ?
                    (preferences[field] ? 1 : 0) : preferences[field];
                values.push(value);
            }
        }

        if (updateFields.length === 0) {
            return Promise.resolve(true);
        }

        // Add updated_at
        updateFields.push('updated_at = ?');
        values.push(Date.now());

        // Add user_id for WHERE clause
        values.push(userId);

        return new Promise((resolve, reject) => {
            // First ensure preferences exist
            this.getPreferences(userId).then(() => {
                db.run(
                    `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = ?`,
                    values,
                    (err) => {
                        if (err) return reject(err);
                        resolve(true);
                    }
                );
            }).catch(reject);
        });
    }

    /**
     * Reset preferences to defaults
     */
    static async resetToDefaults(userId) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE user_preferences SET
                 dark_mode = 1, show_mass = 1, show_border = 1, show_fps = 0,
                 show_grid = 1, continuity = 1, round_food = 1, skin_id = NULL,
                 updated_at = ?
                 WHERE user_id = ?`,
                [Date.now(), userId],
                (err) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    }
}

module.exports = PreferencesRepository;