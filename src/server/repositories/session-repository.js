/*jslint node: true */
'use strict';

const db = require('../sql');

class SessionRepository {
    /**
     * Create a new game session
     */
    static async createSession(userId, arenaId, playerName) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            db.run(
                `INSERT INTO game_sessions (user_id, arena_id, player_name, start_time,
                 mass_eaten, players_eaten, final_score, final_mass, time_played)
                 VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0)`,
                [userId, arenaId, playerName, now],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    /**
     * Update session during gameplay
     */
    static async updateSession(sessionId, updates) {
        const updateFields = [];
        const values = [];

        const allowedFields = ['mass_eaten', 'players_eaten', 'final_score', 'final_mass'];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return Promise.resolve(true);
        }

        values.push(sessionId);

        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE game_sessions SET ${updateFields.join(', ')} WHERE id = ?`,
                values,
                (err) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    }

    /**
     * End a game session
     */
    static async endSession(sessionId, finalData) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT start_time FROM game_sessions WHERE id = ?',
                [sessionId],
                (err, session) => {
                    if (err) return reject(err);
                    if (!session) return reject(new Error('Session not found'));

                    const timePlayed = Math.floor((Date.now() - session.start_time) / 1000);

                    db.run(
                        `UPDATE game_sessions SET
                         end_time = ?, time_played = ?, final_score = ?, final_mass = ?,
                         mass_eaten = ?, players_eaten = ?
                         WHERE id = ?`,
                        [
                            Date.now(),
                            timePlayed,
                            finalData.final_score || 0,
                            finalData.final_mass || 0,
                            finalData.mass_eaten || 0,
                            finalData.players_eaten || 0,
                            sessionId
                        ],
                        (updateErr) => {
                            if (updateErr) return reject(updateErr);
                            resolve({
                                time_played: timePlayed,
                                ...finalData
                            });
                        }
                    );
                }
            );
        });
    }

    /**
     * Get recent sessions for a user
     */
    static async getUserSessions(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM game_sessions
                 WHERE user_id = ?
                 ORDER BY start_time DESC
                 LIMIT ?`,
                [userId, limit],
                (err, sessions) => {
                    if (err) return reject(err);
                    resolve(sessions);
                }
            );
        });
    }

    /**
     * Get active session for a user
     */
    static async getActiveSession(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM game_sessions
                 WHERE user_id = ? AND end_time IS NULL
                 ORDER BY start_time DESC
                 LIMIT 1`,
                [userId],
                (err, session) => {
                    if (err) return reject(err);
                    resolve(session);
                }
            );
        });
    }

    /**
     * Clean up stale sessions (older than 1 hour with no end time)
     */
    static async cleanupStaleSessions() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE game_sessions
                 SET end_time = start_time + 3600000, time_played = 3600
                 WHERE end_time IS NULL AND start_time < ?`,
                [oneHourAgo],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes);
                }
            );
        });
    }
}

module.exports = SessionRepository;