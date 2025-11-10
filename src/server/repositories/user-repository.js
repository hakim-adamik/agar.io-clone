/*jslint node: true */
'use strict';

const pool = require('../sql');
const StatsRepository = require('./stats-repository');

class UserRepository {
    /**
     * Create a new user or get existing user by Privy ID
     */
    static async findOrCreateByPrivyId(privyId, userData) {
        try {
            // First, try to find existing user
            const result = await pool.query(
                'SELECT * FROM users WHERE privy_id = $1',
                [privyId]
            );
            const user = result.rows[0];

            if (user) {
                // Update last_seen
                await pool.query(
                    'UPDATE users SET last_seen = $1 WHERE id = $2',
                    [Date.now(), user.id]
                );
                return user;
            } else {
                // Create new user
                const now = Date.now();
                const insertResult = await pool.query(
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
                const newUser = insertResult.rows[0];

                // Initialize game stats for new user
                try {
                    await StatsRepository.initializeStats(newUser.id);
                    console.log(`[UserRepository] Initialized stats for new user: ${newUser.username} (ID: ${newUser.id})`);
                } catch (statsError) {
                    console.error(`[UserRepository] Failed to initialize stats for user ${newUser.id}:`, statsError);
                    // Don't fail user creation if stats initialization fails
                }

                return newUser;
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
            const result = await pool.query(
                'SELECT * FROM users WHERE id = $1',
                [userId]
            );
            return result.rows[0];
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
            const result = await pool.query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
            return result.rows[0];
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

            await pool.query(
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

            const result = await pool.query(query, params);
            // Convert to number since Postgres returns strings
            const count = parseInt(result.rows[0].count) || 0;
            return count === 0;
        } catch (err) {
            console.error('Error in isUsernameAvailable:', err);
            throw err;
        }
    }
}

module.exports = UserRepository;