/*jslint node: true */
'use strict';

/**
 * Migration: Add win/loss tracking columns to game_stats
 *
 * This migration adds games_won and games_lost columns to track
 * successful escapes (wins) and deaths (losses) separately.
 */

module.exports = {
    version: '20241120_001',
    description: 'Add games_won and games_lost columns to game_stats table',

    async up(pool) {
        console.log('[MIGRATION] Adding win/loss tracking columns to game_stats');

        // Add games_won column
        await pool.query(`
            ALTER TABLE game_stats
            ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0
        `);

        // Add games_lost column
        await pool.query(`
            ALTER TABLE game_stats
            ADD COLUMN IF NOT EXISTS games_lost INTEGER DEFAULT 0
        `);

        console.log('[MIGRATION] Successfully added games_won and games_lost columns');

        return true;
    },

    async down(pool) {
        console.log('[MIGRATION] Removing win/loss tracking columns from game_stats');

        await pool.query(`
            ALTER TABLE game_stats
            DROP COLUMN IF EXISTS games_won,
            DROP COLUMN IF EXISTS games_lost
        `);

        console.log('[MIGRATION] Successfully removed games_won and games_lost columns');

        return true;
    }
};