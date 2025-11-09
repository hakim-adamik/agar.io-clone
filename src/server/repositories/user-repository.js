/*jslint node: true */
'use strict';

const db = require('../db/database-layer');

class UserRepository {
    /**
     * Create a new user or get existing user by Privy ID
     */
    static async findOrCreateByPrivyId(privyId, userData) {
        try {
            // First, try to find existing user
            const user = await db.get(
                'SELECT * FROM users WHERE privy_id = $1',
                [privyId]
            );

            if (user) {
                // Update last_seen
                await db.run(
                    'UPDATE users SET last_seen = $1 WHERE id = $2',
                    [Date.now(), user.id]
                );
                return user;
            } else {
                // Create new user
                const now = Date.now();
                const result = await db.query(
                    `INSERT INTO users (privy_id, username, email, auth_provider, avatar_url, created_at, last_seen)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [
                        privyId,
                        userData.username || `user_${Math.floor(Math.random() * 100000)}`,
                        userData.email || null,
                        userData.authProvider || 'privy',
                        userData.avatarUrl || null,
                        now,
                        now
                    ]
                );
                return result.rows[0];
            }
        } catch (err) {
            console.error('Error in findOrCreateByPrivyId:', err);
            throw err;
        }
    }

    /**
     * Find user by ID
     */
    static async findById(userId) {
        try {
            return await db.get(
                'SELECT * FROM users WHERE id = $1',
                [userId]
            );
        } catch (err) {
            console.error('Error in findById:', err);
            throw err;
        }
    }

    /**
     * Find user by username
     */
    static async findByUsername(username) {
        try {
            return await db.get(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
        } catch (err) {
            console.error('Error in findByUsername:', err);
            throw err;
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId, updates) {
        try {
            const allowedFields = ['username', 'bio', 'region', 'avatar_url'];
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex++}`);
                    values.push(updates[field]);
                }
            }

            if (updateFields.length === 0) {
                return true;
            }

            values.push(userId);

            await db.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
                values
            );
            return true;
        } catch (err) {
            console.error('Error in updateProfile:', err);
            throw err;
        }
    }

    /**
     * Check if username is available
     */
    static async isUsernameAvailable(username, excludeUserId = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM users WHERE username = $1';
            const params = [username];

            if (excludeUserId) {
                query += ' AND id != $2';
                params.push(excludeUserId);
            }

            const result = await db.get(query, params);
            return result.count === 0;
        } catch (err) {
            console.error('Error in isUsernameAvailable:', err);
            throw err;
        }
    }
}

module.exports = UserRepository;