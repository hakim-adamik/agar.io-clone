/*jslint node: true */
'use strict';

const pool = require('../sql');

class SessionRepository {
    /**
     * Create a new game session
     */
    static async createSession(userId, arenaId, playerName) {
        try {
            const now = Date.now();
            const result = await pool.query(
                `INSERT INTO game_sessions (user_id, arena_id, player_name, started_at,
                 mass_eaten, players_eaten, final_score, final_mass, duration)
                 VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0)
                 RETURNING id`,
                [userId, arenaId, playerName, now]
            );
            return result.rows[0].id;
        } catch (err) {
            console.error('Error creating session:', err);
            throw err;
        }
    }

    /**
     * Update session during gameplay
     */
    static async updateSession(sessionId, updates) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            const allowedFields = ['mass_eaten', 'players_eaten', 'final_score', 'final_mass'];

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex++}`);
                    values.push(updates[field]);
                }
            }

            if (updateFields.length === 0) {
                return true;
            }

            values.push(sessionId);

            await pool.query(
                `UPDATE game_sessions SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
                values
            );
            return true;
        } catch (err) {
            console.error('Error updating session:', err);
            throw err;
        }
    }

    /**
     * End a game session
     */
    static async endSession(sessionId, finalData) {
        try {
            const result = await pool.query(
                'SELECT started_at FROM game_sessions WHERE id = $1',
                [sessionId]
            );
            const session = result.rows[0];

            if (!session) {
                throw new Error('Session not found');
            }

            const timePlayed = Math.floor((Date.now() - session.started_at) / 1000);

            await pool.query(
                `UPDATE game_sessions SET
                 ended_at = $1, duration = $2, final_score = $3,
                 players_eaten = $4, mass_eaten = 0, final_mass = 0
                 WHERE id = $5`,
                [
                    Date.now(),
                    timePlayed,
                    finalData.final_score || 0,
                    finalData.players_eaten || 0,
                    sessionId
                ]
            );

            return {
                time_played: timePlayed,
                ...finalData
            };
        } catch (err) {
            console.error('Error ending session:', err);
            throw err;
        }
    }

    /**
     * Get recent sessions for a user
     */
    static async getUserSessions(userId, limit = 10) {
        try {
            const result = await pool.query(
                `SELECT * FROM game_sessions
                 WHERE user_id = $1
                 ORDER BY started_at DESC
                 LIMIT $2`,
                [userId, limit]
            );
            return result.rows;
        } catch (err) {
            console.error('Error getting user sessions:', err);
            throw err;
        }
    }

    /**
     * Get active session for a user
     */
    static async getActiveSession(userId) {
        try {
            const result = await pool.query(
                `SELECT * FROM game_sessions
                 WHERE user_id = $1 AND ended_at IS NULL
                 ORDER BY started_at DESC
                 LIMIT 1`,
                [userId]
            );
            return result.rows[0];
        } catch (err) {
            console.error('Error getting active session:', err);
            throw err;
        }
    }

    /**
     * Clean up stale sessions (older than 1 hour with no end time)
     */
    static async cleanupStaleSessions() {
        try {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);

            const result = await pool.query(
                `UPDATE game_sessions
                 SET ended_at = started_at + 3600000, duration = 3600
                 WHERE ended_at IS NULL AND started_at < $1`,
                [oneHourAgo]
            );
            return result.rowCount;
        } catch (err) {
            console.error('Error cleaning up stale sessions:', err);
            throw err;
        }
    }
}

module.exports = SessionRepository;