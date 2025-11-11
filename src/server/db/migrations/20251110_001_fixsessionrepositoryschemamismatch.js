/*jslint node: true */
'use strict';

/**
 * Migration: fixsessionrepositoryschemamismatch
 * Created: 2025-11-10T15:47:49.388Z
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        console.log('[MIGRATION] Adding missing columns to game_sessions table to match SessionRepository expectations');

        // Add missing columns that SessionRepository expects
        await client.query(`
            ALTER TABLE game_sessions
            ADD COLUMN IF NOT EXISTS player_name TEXT,
            ADD COLUMN IF NOT EXISTS mass_eaten INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS players_eaten INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS final_score INTEGER DEFAULT 0
        `);

        // Create index for player_name lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_sessions_player_name
            ON game_sessions(player_name)
        `);

        console.log('[MIGRATION] ✅ Added missing columns: player_name, mass_eaten, players_eaten, final_score');
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        console.log('[MIGRATION] Rolling back session schema changes');

        // Drop the added columns (rollback)
        await client.query(`
            DROP INDEX IF EXISTS idx_sessions_player_name
        `);

        await client.query(`
            ALTER TABLE game_sessions
            DROP COLUMN IF EXISTS player_name,
            DROP COLUMN IF EXISTS mass_eaten,
            DROP COLUMN IF EXISTS players_eaten,
            DROP COLUMN IF EXISTS final_score
        `);

        console.log('[MIGRATION] ✅ Rolled back session repository schema changes');
    }
};
