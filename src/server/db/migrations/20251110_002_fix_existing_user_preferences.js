/*jslint node: true */
'use strict';

/**
 * Migration: fix_existing_user_preferences
 * Created: 2024-11-10
 *
 * Fixes existing user preferences that were initialized with all false values.
 * Only updates preferences that are still at their "false" default - preserves
 * any user customizations that have been made.
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        console.log('[MIGRATION] Fixing existing user preferences with incorrect defaults');

        // First, let's see how many users have preferences that are all false
        const badPrefsCount = await client.query(`
            SELECT COUNT(*) as count
            FROM user_preferences
            WHERE dark_mode = false
              AND show_mass = false
              AND show_border = false
              AND show_grid = false
              AND continuity = false
              AND round_food = false
        `);

        console.log(`[MIGRATION] Found ${badPrefsCount.rows[0].count} users with all-false preferences (likely incorrect defaults)`);

        if (parseInt(badPrefsCount.rows[0].count) > 0) {
            // Update preferences to correct defaults, but ONLY for users who have all false values
            // (This preserves any customizations users may have made)
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
                WHERE dark_mode = false
                  AND show_mass = false
                  AND show_border = false
                  AND show_grid = false
                  AND continuity = false
                  AND round_food = false
            `, [Date.now()]);

            console.log(`[MIGRATION] ✅ Updated ${result.rowCount} user preference records to correct defaults`);

            // Log which users were updated (for verification)
            const updatedUsers = await client.query(`
                SELECT up.user_id, u.username, up.show_grid, up.dark_mode, up.show_mass
                FROM user_preferences up
                JOIN users u ON up.user_id = u.id
                WHERE up.updated_at = $1
                LIMIT 5
            `, [Date.now()]);

            if (updatedUsers.rows.length > 0) {
                console.log('[MIGRATION] Sample of updated users:');
                updatedUsers.rows.forEach(user => {
                    console.log(`[MIGRATION]   - ${user.username} (ID: ${user.user_id}): showGrid=${user.show_grid}, darkMode=${user.dark_mode}`);
                });
            }
        } else {
            console.log('[MIGRATION] No users found with all-false preferences - nothing to update');
        }
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        console.log('[MIGRATION] Rolling back user preference fixes');

        // This rollback is intentionally limited - we don't want to accidentally
        // reset users' custom preferences. Only rollback if we can identify
        // records that were clearly updated by this migration.

        console.log('[MIGRATION] ⚠️  Rollback not implemented - too risky to reset user preferences');
        console.log('[MIGRATION] If needed, manually inspect user_preferences table and reset specific users');
    }
};