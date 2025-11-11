/*jslint node: true */
'use strict';

const pool = require('../../sql');
const path = require('path');
const fs = require('fs');

class MigrationRunner {
    /**
     * Initialize the migration system by creating the tracking table
     */
    static async initialize() {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(14) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    checksum VARCHAR(32)
                )
            `);
            console.log('[MIGRATIONS] Schema migrations tracking table ready');
        } catch (err) {
            console.error('[MIGRATIONS] Failed to initialize migrations table:', err);
            throw err;
        }
    }

    /**
     * Get list of applied migrations from database
     */
    static async getAppliedMigrations() {
        try {
            const result = await pool.query(
                'SELECT version, name FROM schema_migrations ORDER BY version'
            );
            return new Set(result.rows.map(row => row.version));
        } catch (err) {
            console.error('[MIGRATIONS] Failed to get applied migrations:', err);
            throw err;
        }
    }

    /**
     * Get available migration files from filesystem
     */
    static getMigrationFiles() {
        const migrationsDir = __dirname;
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.match(/^\d{8}_\d{3}_.*\.js$/))
            .sort();

        return files.map(file => {
            const match = file.match(/^(\d{8}_\d{3})_(.*)\.js$/);
            return {
                version: match[1],
                name: match[2],
                filename: file,
                filepath: path.join(migrationsDir, file)
            };
        });
    }

    /**
     * Record a migration as applied
     */
    static async recordMigration(version, name) {
        try {
            await pool.query(
                'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
                [version, name]
            );
            console.log(`[MIGRATIONS] ✅ Recorded migration: ${version} - ${name}`);
        } catch (err) {
            console.error(`[MIGRATIONS] Failed to record migration ${version}:`, err);
            throw err;
        }
    }

    /**
     * Run a single migration within a transaction
     */
    static async runMigration(migration) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Load and execute the migration
            console.log(`[MIGRATIONS] 🚀 Running migration: ${migration.version} - ${migration.name}`);
            const migrationModule = require(migration.filepath);

            if (typeof migrationModule.up !== 'function') {
                throw new Error(`Migration ${migration.filename} must export an 'up' function`);
            }

            // Wrap client for schema lock bypass (migrations are allowed to modify schema)
            const schemaLock = require('../schema-lock');
            const migrationClient = schemaLock.createMigrationClient(client);

            await migrationModule.up(migrationClient);

            // Record the migration as applied
            await client.query(
                'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
                [migration.version, migration.name]
            );

            await client.query('COMMIT');
            console.log(`[MIGRATIONS] ✅ Applied migration: ${migration.version} - ${migration.name}`);

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[MIGRATIONS] ❌ Failed migration ${migration.version}:`, err);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Run all pending migrations
     */
    static async runPendingMigrations() {
        try {
            console.log('[MIGRATIONS] 🔍 Checking for pending migrations...');

            await this.initialize();
            const appliedMigrations = await this.getAppliedMigrations();
            const availableMigrations = this.getMigrationFiles();

            const pendingMigrations = availableMigrations.filter(
                migration => !appliedMigrations.has(migration.version)
            );

            if (pendingMigrations.length === 0) {
                console.log('[MIGRATIONS] 📋 No pending migrations');
                return;
            }

            console.log(`[MIGRATIONS] 📋 Found ${pendingMigrations.length} pending migration(s):`);
            pendingMigrations.forEach(m => {
                console.log(`[MIGRATIONS]    - ${m.version} - ${m.name}`);
            });

            // Run each pending migration
            for (const migration of pendingMigrations) {
                await this.runMigration(migration);
            }

            console.log(`[MIGRATIONS] 🎉 Successfully applied ${pendingMigrations.length} migration(s)`);

        } catch (err) {
            console.error('[MIGRATIONS] 💥 Migration system failed:', err);
            throw err;
        }
    }

    /**
     * Create a new migration file template
     */
    static createMigration(name) {
        if (!name) {
            throw new Error('Migration name is required');
        }

        const timestamp = new Date().toISOString()
            .replace(/[-:T]/g, '')
            .slice(0, 8);
        const counter = '001'; // Simple counter for same-day migrations
        const version = `${timestamp}_${counter}`;
        const filename = `${version}_${name}.js`;
        const filepath = path.join(__dirname, filename);

        const template = `/*jslint node: true */
'use strict';

/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        // Add your migration SQL here
        // Example:
        // await client.query(\`
        //     ALTER TABLE users
        //     ADD COLUMN new_field VARCHAR(255)
        // \`);

        console.log('[MIGRATION] ${name}: Add your migration logic here');
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        // Add rollback SQL here (optional)
        // Example:
        // await client.query(\`
        //     ALTER TABLE users
        //     DROP COLUMN new_field
        // \`);

        console.log('[MIGRATION] ${name}: Add rollback logic here (optional)');
    }
};
`;

        fs.writeFileSync(filepath, template);
        console.log(`[MIGRATIONS] 📝 Created migration: ${filename}`);
        return filename;
    }
}

module.exports = MigrationRunner;