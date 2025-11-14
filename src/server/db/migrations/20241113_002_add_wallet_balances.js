/*jslint node: true */
'use strict';

/**
 * Migration: add_wallet_balances
 * Created: 2024-11-13
 *
 * Adds wallet_balances table to store virtual dollar amounts for each authenticated user.
 * This enables virtual economy for in-game purchases, rewards, and future real currency integration.
 */
module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        // Create wallet_balances table
        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                privy_id VARCHAR(255) NOT NULL,
                balance DECIMAL(18,6) DEFAULT 1.000000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Ensure one wallet per user
                CONSTRAINT wallet_balances_user_unique UNIQUE(user_id),
                CONSTRAINT wallet_balances_privy_unique UNIQUE(privy_id),

                -- Foreign key constraint
                CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

                -- Balance must be non-negative
                CONSTRAINT balance_non_negative CHECK(balance >= 0.000000)
            )
        `);

        // Create indexes for efficient queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id
            ON wallet_balances(user_id)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_wallet_balances_privy_id
            ON wallet_balances(privy_id)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_wallet_balances_balance
            ON wallet_balances(balance DESC)
        `);

        // Add updated_at trigger for automatic timestamp updates
        await client.query(`
            CREATE OR REPLACE FUNCTION update_wallet_balance_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await client.query(`
            CREATE TRIGGER wallet_balance_updated_at
            BEFORE UPDATE ON wallet_balances
            FOR EACH ROW
            EXECUTE FUNCTION update_wallet_balance_timestamp()
        `);

        // Initialize wallet balances for existing users with a default $1 starting balance
        await client.query(`
            INSERT INTO wallet_balances (user_id, privy_id, balance, created_at, updated_at)
            SELECT
                u.id,
                u.privy_id,
                1.000000 as balance,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM wallet_balances w WHERE w.user_id = u.id
            )
        `);

        console.log('[MIGRATION] add_wallet_balances: Created wallet_balances table with indexes and triggers');
        console.log('[MIGRATION] add_wallet_balances: Initialized wallets for existing users with $1.000000 starting balance');
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        // Drop trigger and function
        await client.query(`
            DROP TRIGGER IF EXISTS wallet_balance_updated_at ON wallet_balances
        `);

        await client.query(`
            DROP FUNCTION IF EXISTS update_wallet_balance_timestamp()
        `);

        // Drop indexes
        await client.query(`
            DROP INDEX IF EXISTS idx_wallet_balances_user_id
        `);

        await client.query(`
            DROP INDEX IF EXISTS idx_wallet_balances_privy_id
        `);

        await client.query(`
            DROP INDEX IF EXISTS idx_wallet_balances_balance
        `);

        // Drop table
        await client.query(`
            DROP TABLE IF EXISTS wallet_balances
        `);

        console.log('[MIGRATION] add_wallet_balances: Removed wallet_balances table and related objects');
    }
};