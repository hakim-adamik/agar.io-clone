/*jslint node: true */
'use strict';

const db = require('../db/database-layer');

class StatsRepository {
    /**
     * Initialize stats for a new user
     */
    static async initializeStats(userId) {
        try {
            await db.run(
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
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM game_stats WHERE user_id = ?',
                [userId],
                async (err, stats) => {
                    if (err) return reject(err);

                    // Initialize stats if they don't exist
                    if (!stats) {
                        await this.initializeStats(userId);
                        db.get(
                            'SELECT * FROM game_stats WHERE user_id = ?',
                            [userId],
                            (err2, newStats) => {
                                if (err2) return reject(err2);
                                resolve(newStats);
                            }
                        );
                    } else {
                        resolve(stats);
                    }
                }
            );
        });
    }

    /**
     * Update stats after a game session
     */
    static async updateStats(userId, sessionData) {
        return new Promise((resolve, reject) => {
            // First get current stats
            db.get(
                'SELECT * FROM game_stats WHERE user_id = ?',
                [userId],
                (err, currentStats) => {
                    if (err) return reject(err);

                    if (!currentStats) {
                        // Initialize if doesn't exist
                        this.initializeStats(userId).then(() => {
                            this.updateStats(userId, sessionData).then(resolve).catch(reject);
                        }).catch(reject);
                        return;
                    }

                    // Calculate new stats
                    const newStats = {
                        games_played: currentStats.games_played + 1,
                        total_mass_eaten: currentStats.total_mass_eaten + (sessionData.mass_eaten || 0),
                        total_players_eaten: currentStats.total_players_eaten + (sessionData.players_eaten || 0),
                        total_playtime: currentStats.total_playtime + (sessionData.time_played || 0),
                        highest_mass: Math.max(currentStats.highest_mass, sessionData.final_score || 0),
                        longest_survival: Math.max(currentStats.longest_survival, sessionData.time_played || 0),
                        updated_at: Date.now()
                    };

                    // Update in database
                    db.run(
                        `UPDATE game_stats SET
                         games_played = ?, total_mass_eaten = ?, total_players_eaten = ?,
                         total_playtime = ?, highest_mass = ?, longest_survival = ?, updated_at = ?
                         WHERE user_id = ?`,
                        [
                            newStats.games_played,
                            newStats.total_mass_eaten,
                            newStats.total_players_eaten,
                            newStats.total_playtime,
                            newStats.highest_mass,
                            newStats.longest_survival,
                            newStats.updated_at,
                            userId
                        ],
                        (updateErr) => {
                            if (updateErr) return reject(updateErr);
                            resolve(newStats);
                        }
                    );
                }
            );
        });
    }

    /**
     * Get leaderboard data
     */
    static async getLeaderboard(limit = 10, offset = 0) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT u.username, u.avatar_url, g.highest_mass, g.games_played, g.total_playtime
                 FROM game_stats g
                 JOIN users u ON g.user_id = u.id
                 WHERE u.is_banned = 0
                 ORDER BY g.highest_mass DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    /**
     * Get user rank based on highest_mass leaderboard position
     */
    static async getUserRank(userId) {
        try {
            const result = await db.get(
                `SELECT COUNT(*) + 1 as rank
                 FROM game_stats g
                 JOIN users u ON g.user_id = u.id
                 WHERE g.highest_mass > (SELECT COALESCE(highest_mass, 0) FROM game_stats WHERE user_id = $1)
                 AND (u.is_banned IS NULL OR u.is_banned = FALSE)`,
                [userId]
            );

            // Convert rank to number since Postgres returns strings
            const rank = result ? parseInt(result.rank) : null;
            return rank;
        } catch (err) {
            console.error('Error getting user rank:', err);
            throw err;
        }
    }
}

module.exports = StatsRepository;