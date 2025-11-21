/*jslint node: true */
'use strict';

const pool = require('../sql');

class WalletRepository {
    /**
     * Get or create wallet balance for a user
     * @param {number} userId - User ID
     * @param {string} privyId - Privy ID for backup lookup
     * @returns {Object} Wallet balance record
     */
    static async getOrCreateWallet(userId, privyId) {
        try {
            // Try to find existing wallet
            const result = await pool.query(
                'SELECT * FROM wallet_balances WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // Create new wallet with default balance ($0.000000)
            const insertResult = await pool.query(
                `INSERT INTO wallet_balances (user_id, privy_id, balance, created_at, updated_at)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [userId, privyId, 0.000000]
            );
            return insertResult.rows[0];
        } catch (error) {
            console.error('[WalletRepository] Error in getOrCreateWallet:', error);
            throw error;
        }
    }

    /**
     * Get wallet balance by user ID
     * @param {number} userId - User ID
     * @returns {Object|null} Wallet balance record or null if not found
     */
    static async getWalletByUserId(userId) {
        try {
            const result = await pool.query(
                'SELECT * FROM wallet_balances WHERE user_id = $1',
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('[WalletRepository] Error in getWalletByUserId:', error);
            throw error;
        }
    }

    /**
     * Get wallet balance by Privy ID
     * @param {string} privyId - Privy ID
     * @returns {Object|null} Wallet balance record or null if not found
     */
    static async getWalletByPrivyId(privyId) {
        try {
            const result = await pool.query(
                'SELECT * FROM wallet_balances WHERE privy_id = $1',
                [privyId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('[WalletRepository] Error in getWalletByPrivyId:', error);
            throw error;
        }
    }

    /**
     * Update wallet balance
     * @param {number} userId - User ID
     * @param {number} newBalance - New balance amount
     * @returns {Object} Updated wallet record
     */
    static async updateBalance(userId, newBalance) {
        try {
            // Ensure balance is non-negative
            if (newBalance < 0) {
                throw new Error(`Cannot set negative balance: ${newBalance}`);
            }

            const result = await pool.query(
                `UPDATE wallet_balances
                 SET balance = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2
                 RETURNING *`,
                [newBalance, userId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Wallet not found for user ${userId}`);
            }

            console.log(`[WalletRepository] Updated balance for user ${userId}: $${newBalance}`);
            return result.rows[0];
        } catch (error) {
            console.error('[WalletRepository] Error in updateBalance:', error);
            throw error;
        }
    }

    /**
     * Add money to wallet
     * @param {number} userId - User ID
     * @param {number} amount - Amount to add
     * @returns {Object} Updated wallet record
     */
    static async addBalance(userId, amount) {
        try {
            if (amount <= 0) {
                throw new Error(`Amount must be positive: ${amount}`);
            }

            const result = await pool.query(
                `UPDATE wallet_balances
                 SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2
                 RETURNING *`,
                [amount, userId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Wallet not found for user ${userId}`);
            }

            console.log(`[WalletRepository] Added $${amount} to user ${userId} balance`);
            return result.rows[0];
        } catch (error) {
            console.error('[WalletRepository] Error in addBalance:', error);
            throw error;
        }
    }

    /**
     * Subtract money from wallet (with balance check)
     * @param {number} userId - User ID
     * @param {number} amount - Amount to subtract
     * @returns {Object} Updated wallet record
     * @throws {Error} If insufficient balance
     */
    static async subtractBalance(userId, amount) {
        try {
            if (amount <= 0) {
                throw new Error(`Amount must be positive: ${amount}`);
            }

            // Check current balance first
            const currentWallet = await this.getWalletByUserId(userId);
            if (!currentWallet) {
                throw new Error(`Wallet not found for user ${userId}`);
            }

            const currentBalance = parseFloat(currentWallet.balance);
            if (currentBalance < amount) {
                throw new Error(`Insufficient balance: has $${currentBalance}, needs $${amount}`);
            }

            const result = await pool.query(
                `UPDATE wallet_balances
                 SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2 AND balance >= $1
                 RETURNING *`,
                [amount, userId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Insufficient balance or wallet not found for user ${userId}`);
            }

            console.log(`[WalletRepository] Subtracted $${amount} from user ${userId} balance`);
            return result.rows[0];
        } catch (error) {
            console.error('[WalletRepository] Error in subtractBalance:', error);
            throw error;
        }
    }

    /**
     * Transfer money between wallets
     * @param {number} fromUserId - Source user ID
     * @param {number} toUserId - Destination user ID
     * @param {number} amount - Amount to transfer
     * @returns {Object} Object containing both updated wallet records
     */
    static async transferBalance(fromUserId, toUserId, amount) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            if (amount <= 0) {
                throw new Error(`Transfer amount must be positive: ${amount}`);
            }

            // Subtract from source wallet
            const fromResult = await client.query(
                `UPDATE wallet_balances
                 SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2 AND balance >= $1
                 RETURNING *`,
                [amount, fromUserId]
            );

            if (fromResult.rows.length === 0) {
                throw new Error(`Insufficient balance or source wallet not found for user ${fromUserId}`);
            }

            // Add to destination wallet
            const toResult = await client.query(
                `UPDATE wallet_balances
                 SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2
                 RETURNING *`,
                [amount, toUserId]
            );

            if (toResult.rows.length === 0) {
                throw new Error(`Destination wallet not found for user ${toUserId}`);
            }

            await client.query('COMMIT');

            console.log(`[WalletRepository] Transferred $${amount} from user ${fromUserId} to user ${toUserId}`);
            return {
                fromWallet: fromResult.rows[0],
                toWallet: toResult.rows[0]
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[WalletRepository] Error in transferBalance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get top wallets by balance (leaderboard)
     * @param {number} limit - Number of top wallets to return (default 10)
     * @returns {Array} Array of wallet records with user info
     */
    static async getTopWallets(limit = 10) {
        try {
            const result = await pool.query(
                `SELECT w.*, u.username, u.avatar_url
                 FROM wallet_balances w
                 JOIN users u ON w.user_id = u.id
                 WHERE u.is_banned = false
                 ORDER BY w.balance DESC
                 LIMIT $1`,
                [limit]
            );
            return result.rows;
        } catch (error) {
            console.error('[WalletRepository] Error in getTopWallets:', error);
            throw error;
        }
    }

    /**
     * Get wallet statistics
     * @returns {Object} Statistics about all wallets
     */
    static async getWalletStats() {
        try {
            const result = await pool.query(`
                SELECT
                    COUNT(*) as total_wallets,
                    SUM(balance) as total_balance,
                    AVG(balance) as average_balance,
                    MIN(balance) as min_balance,
                    MAX(balance) as max_balance
                FROM wallet_balances
            `);
            return result.rows[0];
        } catch (error) {
            console.error('[WalletRepository] Error in getWalletStats:', error);
            throw error;
        }
    }
}

module.exports = WalletRepository;