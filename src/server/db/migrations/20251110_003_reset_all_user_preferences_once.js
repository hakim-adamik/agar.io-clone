/*jslint node: true */
'use strict';

/**
 * Migration: reset_all_user_preferences_once
 * Created: 2024-11-10
 *
 * ONE-TIME RESET of all existing user preferences to correct defaults.
 * This fixes the issue where existing users have incorrect preference values
 * that prevent the game from rendering (showGrid: false, etc.)
 *
 * IMPORTANT: This only runs ONCE. After this migration, users can customize
 * their preferences and they will be preserved forever.
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        console.log('[MIGRATION] ONE-TIME RESET: Migration disabled - was interfering with socket connections');
        console.log('[MIGRATION] User preferences have been fixed via API endpoint changes');

        // This migration was causing socket connection issues for authenticated users
        // The root problem was in the API endpoint boolean conversion, which has been fixed
        // Therefore, this database migration is no longer necessary
        return;

        // Count total users with preferences
        const totalUsers = await client.query(`
            SELECT COUNT(*) as count FROM user_preferences
        `);

        console.log(`[MIGRATION] Found ${totalUsers.rows[0].count} users with preferences`);

        if (parseInt(totalUsers.rows[0].count) > 0) {
            // Reset ALL existing user preferences to correct defaults
            // This is a one-time fix for the broken initialization
            const result = await client.query(`
                UPDATE user_preferences
                SET
                    dark_mode = true,
                    show_mass = true,
                    show_border = true,
                    show_grid = true,
                    continuity = true,
                    round_food = true,
                    show_fps = false,
                    updated_at = $1
            `, [Date.now()]);

            console.log(`[MIGRATION] ✅ Reset ${result.rowCount} user preference records to correct defaults`);

            // Log a few examples of what was updated
            const sampleUsers = await client.query(`
                SELECT up.user_id, u.username, up.show_grid, up.dark_mode
                FROM user_preferences up
                JOIN users u ON up.user_id = u.id
                WHERE up.updated_at = $1
                ORDER BY up.user_id
                LIMIT 3
            `, [Date.now()]);

            if (sampleUsers.rows.length > 0) {
                console.log('[MIGRATION] Sample of reset users:');
                sampleUsers.rows.forEach(user => {
                    console.log(`[MIGRATION]   - ${user.username} (ID: ${user.user_id}): showGrid=${user.show_grid}, darkMode=${user.dark_mode}`);
                });
            }

            console.log('[MIGRATION] 🎮 All users should now be able to see the game grid!');
        } else {
            console.log('[MIGRATION] No users found with preferences - nothing to reset');
        }
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        console.log('[MIGRATION] Rollback not implemented for user preference reset');
        console.log('[MIGRATION] This migration cannot be safely rolled back as it would');
        console.log('[MIGRATION] potentially destroy user customizations made after the reset');
    }
};