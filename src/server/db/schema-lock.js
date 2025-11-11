/*jslint node: true */
'use strict';

/**
 * Schema Lock Protection System
 *
 * This module provides runtime protection against direct schema modifications
 * outside of the migration system. It monitors database queries and blocks
 * dangerous schema operations that bypass migrations.
 */

const fs = require('fs');
const path = require('path');

class SchemaLock {
    constructor() {
        this.isEnabled = process.env.NODE_ENV === 'production' || process.env.ENFORCE_SCHEMA_LOCK === 'true';
        this.allowedSchemaQueries = new Set([
            // Only allow IF NOT EXISTS operations for initial setup
            'CREATE TABLE IF NOT EXISTS',
            'CREATE INDEX IF NOT EXISTS'
        ]);

        this.dangerousPatterns = [
            /ALTER TABLE\s+\w+\s+ADD COLUMN(?!\s+IF NOT EXISTS)/i,
            /ALTER TABLE\s+\w+\s+DROP COLUMN/i,
            /DROP TABLE(?!\s+IF EXISTS)/i,
            /CREATE TABLE(?!\s+IF NOT EXISTS)/i,
            /CREATE INDEX(?!\s+IF NOT EXISTS)/i,
            /DROP INDEX/i,
            /ALTER TABLE\s+\w+\s+ADD CONSTRAINT/i,
            /ALTER TABLE\s+\w+\s+DROP CONSTRAINT/i
        ];

        if (this.isEnabled) {
            console.log('[SCHEMA-LOCK] 🔒 Schema modification protection ENABLED');
            console.log('[SCHEMA-LOCK] 📋 All schema changes must go through migrations');
        }
    }

    /**
     * Check if a query contains dangerous schema modifications
     */
    checkQuery(query, context = 'unknown') {
        if (!this.isEnabled) {
            return true; // Allow in development
        }

        // Skip migration context - migrations are allowed to modify schema
        if (context === 'migration' || context.includes('migration')) {
            return true;
        }

        // Check for dangerous patterns
        const queryText = query.trim();

        for (const pattern of this.dangerousPatterns) {
            if (pattern.test(queryText)) {
                const error = new Error(`
🚨 SCHEMA LOCK VIOLATION 🚨

Query blocked: Direct schema modification detected outside migration system.

Dangerous query: ${queryText}
Context: ${context}
Location: ${this.getStackLocation()}

✅ CORRECT WORKFLOW:
1. Create migration: npm run migration:create your_change
2. Edit migration file with your schema changes
3. Restart server to apply migration

🔒 Schema modifications are only allowed through the migration system
   to ensure consistency across all environments.
`);

                error.name = 'SchemaLockViolation';
                throw error;
            }
        }

        return true;
    }

    /**
     * Get the stack location where the schema modification was attempted
     */
    getStackLocation() {
        const stack = new Error().stack;
        const lines = stack.split('\n');

        // Find the first line that's not from this file
        for (let i = 2; i < Math.min(lines.length, 10); i++) {
            const line = lines[i];
            if (line && !line.includes('schema-lock.js') && !line.includes('node_modules')) {
                return line.trim();
            }
        }

        return 'unknown location';
    }

    /**
     * Wrap a database client to intercept queries
     */
    wrapClient(client, context = 'application') {
        const originalQuery = client.query.bind(client);

        client.query = (text, params, callback) => {
            // Handle different query signatures
            let queryText = '';

            if (typeof text === 'string') {
                queryText = text;
            } else if (text && text.text) {
                queryText = text.text;
            }

            // Check the query before executing
            this.checkQuery(queryText, context);

            // Execute the original query
            return originalQuery(text, params, callback);
        };

        return client;
    }

    /**
     * Create a migration-safe client wrapper
     */
    createMigrationClient(client) {
        return this.wrapClient(client, 'migration');
    }
}

// Singleton instance
const schemaLock = new SchemaLock();

module.exports = schemaLock;