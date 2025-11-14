/*jslint node: true */
'use strict';

/**
 * Migration: add_music_enabled_preference
 * Created: 2024-11-13
 *
 * Adds music_enabled field to user_preferences table to control background music
 * separately from sound effects.
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        // Add music_enabled column to user_preferences table
        await client.query(`
            ALTER TABLE user_preferences
            ADD COLUMN IF NOT EXISTS music_enabled BOOLEAN DEFAULT TRUE
        `);

        console.log('[MIGRATION] add_music_enabled_preference: Added music_enabled column to user_preferences');
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        await client.query(`
            ALTER TABLE user_preferences
            DROP COLUMN IF EXISTS music_enabled
        `);

        console.log('[MIGRATION] add_music_enabled_preference: Removed music_enabled column from user_preferences');
    }
};