/*jslint node: true */
'use strict';

const pool = require('../sql');

class StatsRepository {
    /**
     * Initialize stats for a new user
     */
    static async initializeStats(userId) {
        try {
            await pool.query(
                `INSERT INTO game_stats (user_id, games_played, total_mass_eaten, total_players_eaten,
                 total_playtime, highest_mass, longest_survival, updated_at)
                 VALUES ($1, 0, 0, 0, 0, 0, 0, $2)`,
                [userId, Date.now()]
            );
            return true;
        } catch (err) {
            console.error('Error initializing stats:', err);
            throw err;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(userId) {
        try {
            let result = await pool.query(
                'SELECT * FROM game_stats WHERE user_id = $1',
                [userId]
            );
            let stats = result.rows[0];

            // Initialize stats if they don't exist
            if (!stats) {
                await this.initializeStats(userId);
                result = await pool.query(
                    'SELECT * FROM game_stats WHERE user_id = $1',
                    [userId]
                );
                stats = result.rows[0];
            }

            return stats;
        } catch (err) {
            console.error('Error getting user stats:', err);
            throw err;
        }
    }

    /**
     * Update stats after a game session
     */
    static async updateStats(userId, sessionData) {
        try {
            // First get current stats
            let result = await pool.query(
                'SELECT * FROM game_stats WHERE user_id = $1',
                [userId]
            );
            let currentStats = result.rows[0];

            if (!currentStats) {
                // Initialize if doesn't exist
                await this.initializeStats(userId);
                result = await pool.query(
                    'SELECT * FROM game_stats WHERE user_id = $1',
                    [userId]
                );
                currentStats = result.rows[0];
            }

            // Calculate new stats
            const newStats = {
                games_played: currentStats.games_played + 1,
                total_mass_eaten: currentStats.total_mass_eaten,  // Keep existing, not tracking anymore
                total_players_eaten: currentStats.total_players_eaten + (sessionData.players_eaten || 0),
                total_playtime: currentStats.total_playtime + (sessionData.time_played || 0),
                highest_mass: Math.max(currentStats.highest_mass, sessionData.final_score || 0),
                longest_survival: Math.max(currentStats.longest_survival, sessionData.time_played || 0),
                updated_at: Date.now()
            };

            // Track wins and losses
            if (sessionData.game_result === 'won') {
                newStats.games_won = (currentStats.games_won || 0) + 1;
            } else if (sessionData.game_result === 'lost') {
                newStats.games_lost = (currentStats.games_lost || 0) + 1;
            }

            // Update in database (including wins/losses)
            await pool.query(
                `UPDATE game_stats SET
                 games_played = $1, total_mass_eaten = $2, total_players_eaten = $3,
                 total_playtime = $4, highest_mass = $5, longest_survival = $6,
                 games_won = $7, games_lost = $8, updated_at = $9
                 WHERE user_id = $10`,
                [
                    newStats.games_played,
                    newStats.total_mass_eaten,
                    newStats.total_players_eaten,
                    newStats.total_playtime,
                    newStats.highest_mass,
                    newStats.longest_survival,
                    newStats.games_won || currentStats.games_won || 0,
                    newStats.games_lost || currentStats.games_lost || 0,
                    newStats.updated_at,
                    userId
                ]
            );

            return newStats;
        } catch (err) {
            console.error('Error updating stats:', err);
            throw err;
        }
    }

    /**
     * Get leaderboard data
     */
    static async getLeaderboard(limit = 10, offset = 0) {
        try {
            const result = await pool.query(
                `SELECT u.username, u.avatar_url, g.highest_mass, g.games_played, g.total_playtime
                 FROM game_stats g
                 JOIN users u ON g.user_id = u.id
                 WHERE (u.is_banned IS NULL OR u.is_banned = FALSE)
                 ORDER BY g.highest_mass DESC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            return result.rows;
        } catch (err) {
            console.error('Error getting leaderboard:', err);
            throw err;
        }
    }

    /**
     * Get user rank based on highest_mass leaderboard position
     */
    static async getUserRank(userId) {
        try {
            const result = await pool.query(
                `SELECT COUNT(*) + 1 as rank
                 FROM game_stats g
                 JOIN users u ON g.user_id = u.id
                 WHERE g.highest_mass > (SELECT COALESCE(highest_mass, 0) FROM game_stats WHERE user_id = $1)
                 AND (u.is_banned IS NULL OR u.is_banned = FALSE)`,
                [userId]
            );

            // Convert rank to number since Postgres returns strings
            const rank = result.rows[0] ? parseInt(result.rows[0].rank) : null;
            return rank;
        } catch (err) {
            console.error('Error getting user rank:', err);
            throw err;
        }
    }
}

module.exports = StatsRepository;