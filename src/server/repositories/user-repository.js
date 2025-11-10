/*jslint node: true */
'use strict';

const db = require('../sql');

class UserRepository {
    /**
     * Create a new user or get existing user by Privy ID
     */
    static async findOrCreateByPrivyId(privyId, userData) {
        return new Promise((resolve, reject) => {
            // First, try to find existing user
            db.get(
                'SELECT * FROM users WHERE privy_id = ?',
                [privyId],
                (err, user) => {
                    if (err) return reject(err);

                    if (user) {
                        // Update last_seen
                        db.run(
                            'UPDATE users SET last_seen = ? WHERE id = ?',
                            [Date.now(), user.id],
                            (updateErr) => {
                                if (updateErr) return reject(updateErr);
                                resolve(user);
                            }
                        );
                    } else {
                        // Create new user
                        const now = Date.now();
                        db.run(
                            `INSERT INTO users (privy_id, username, email, auth_provider, avatar_url, created_at, last_seen)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                privyId,
                                userData.username || `user_${Math.floor(Math.random() * 100000)}`,
                                userData.email || null,
                                userData.authProvider || 'privy',
                                userData.avatarUrl || null,
                                now,
                                now
                            ],
                            function(insertErr) {
                                if (insertErr) return reject(insertErr);

                                // Return newly created user
                                db.get(
                                    'SELECT * FROM users WHERE id = ?',
                                    [this.lastID],
                                    (getErr, newUser) => {
                                        if (getErr) return reject(getErr);
                                        resolve(newUser);
                                    }
                                );
                            }
                        );
                    }
                }
            );
        });
    }

    /**
     * Find user by ID
     */
    static async findById(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) return reject(err);
                    resolve(user);
                }
            );
        });
    }

    /**
     * Find user by username
     */
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, user) => {
                    if (err) return reject(err);
                    resolve(user);
                }
            );
        });
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId, updates) {
        const allowedFields = ['username', 'bio', 'region', 'avatar_url'];
        const updateFields = [];
        const values = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return Promise.resolve(true);
        }

        values.push(userId);

        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                values,
                (err) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    }

    /**
     * Check if username is available
     */
    static async isUsernameAvailable(username, excludeUserId = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
            const params = [username];

            if (excludeUserId) {
                query += ' AND id != ?';
                params.push(excludeUserId);
            }

            db.get(query, params, (err, result) => {
                if (err) return reject(err);
                resolve(result.count === 0);
            });
        });
    }
}

module.exports = UserRepository;