# Database Migration System

This document explains how to use the database migration system for schema changes.

## Overview

The migration system provides:
- **Version Tracking**: All applied migrations are recorded in `schema_migrations` table
- **Transaction Safety**: Each migration runs within a PostgreSQL transaction
- **Automatic Execution**: Migrations run automatically on server startup
- **Sequential Processing**: Migrations are applied in chronological order
- **Rollback Support**: Optional down() methods for reversing changes

## Migration File Format

Migrations are stored in `src/server/db/migrations/` with the naming convention:
```
YYYYMMDD_NNN_description.js
```

Example: `20241110_001_add_user_preferences.js`

### Migration Template

```javascript
/*jslint node: true */
'use strict';

/**
 * Migration: add_user_preferences
 * Created: 2024-11-10
 */

module.exports = {
    /**
     * Run the migration
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async up(client) {
        await client.query(`
            ALTER TABLE users
            ADD COLUMN preferences_version INTEGER DEFAULT 1
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_preferences_version
            ON users(preferences_version)
        `);

        console.log('[MIGRATION] add_user_preferences: Added preferences versioning');
    },

    /**
     * Rollback the migration (optional)
     * @param {Object} client - PostgreSQL client (within transaction)
     */
    async down(client) {
        await client.query(`
            DROP INDEX IF EXISTS idx_users_preferences_version
        `);

        await client.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS preferences_version
        `);

        console.log('[MIGRATION] add_user_preferences: Removed preferences versioning');
    }
};
```

## How It Works

1. **Server Startup**: Migration system runs automatically during database initialization
2. **Tracking Table**: Creates `schema_migrations` table to track applied migrations
3. **File Discovery**: Scans `src/server/db/migrations/` for migration files
4. **Pending Detection**: Compares available migrations vs applied migrations
5. **Sequential Execution**: Runs pending migrations in chronological order
6. **Transaction Wrapper**: Each migration runs within its own transaction
7. **Recording**: Successfully applied migrations are recorded in tracking table

## Creating Migrations

### Method 1: Manual Creation (Recommended for understanding)

1. Create a new file in `src/server/db/migrations/`
2. Use the naming convention: `YYYYMMDD_NNN_description.js`
3. Copy the template above and modify the `up()` function
4. Optionally implement `down()` for rollbacks

### Method 2: Using Migration Runner (Future Enhancement)

```javascript
// Future CLI command
const MigrationRunner = require('./src/server/db/migrations/runner');
MigrationRunner.createMigration('add_user_preferences');
```

## Common Migration Patterns

### Adding Columns

```javascript
async up(client) {
    await client.query(`
        ALTER TABLE users
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN phone_number VARCHAR(20)
    `);
}
```

### Creating Tables

```javascript
async up(client) {
    await client.query(`
        CREATE TABLE user_achievements (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            achievement_type VARCHAR(50) NOT NULL,
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data JSONB
        )
    `);

    await client.query(`
        CREATE INDEX idx_achievements_user_id ON user_achievements(user_id)
    `);
}
```

### Modifying Columns

```javascript
async up(client) {
    // Change column type
    await client.query(`
        ALTER TABLE game_sessions
        ALTER COLUMN duration TYPE BIGINT
    `);

    // Add constraints
    await client.query(`
        ALTER TABLE users
        ADD CONSTRAINT username_min_length CHECK(length(username) >= 3)
    `);
}
```

### Data Migrations

```javascript
async up(client) {
    // Migrate existing data
    await client.query(`
        UPDATE users
        SET email_verified = TRUE
        WHERE auth_provider = 'google' AND email IS NOT NULL
    `);

    // Convert data formats
    await client.query(`
        UPDATE game_sessions
        SET duration = extract(epoch from (ended_at - started_at)) * 1000
        WHERE duration IS NULL AND ended_at IS NOT NULL
    `);
}
```

## Best Practices

### 1. Always Use Transactions
The migration system automatically wraps each migration in a transaction, but be aware:

```javascript
// ✅ Good - atomic operation
async up(client) {
    await client.query('ALTER TABLE users ADD COLUMN new_field TEXT');
    await client.query('UPDATE users SET new_field = username WHERE new_field IS NULL');
}

// ❌ Avoid - separate transactions can cause inconsistency if run manually
async up(client) {
    await client.query('BEGIN');
    // ... migration code ...
    await client.query('COMMIT');
}
```

### 2. Use IF NOT EXISTS for Safety

```javascript
// ✅ Safe for re-running
await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS new_field TEXT
`);

await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_new_field
    ON users(new_field)
`);

// ❌ Will fail if re-run
await client.query(`
    ALTER TABLE users
    ADD COLUMN new_field TEXT
`);
```

### 3. Handle Large Data Sets Carefully

```javascript
// ✅ Good for large tables - process in batches
async up(client) {
    let offset = 0;
    const batchSize = 1000;

    while (true) {
        const result = await client.query(`
            UPDATE users
            SET normalized_username = LOWER(username)
            WHERE id IN (
                SELECT id FROM users
                WHERE normalized_username IS NULL
                ORDER BY id
                LIMIT $1 OFFSET $2
            )
        `, [batchSize, offset]);

        if (result.rowCount === 0) break;
        offset += batchSize;

        console.log(`[MIGRATION] Processed ${offset} users...`);
    }
}
```

### 4. Test Migrations Thoroughly

```javascript
// ✅ Include validation in migration
async up(client) {
    await client.query(`
        ALTER TABLE users
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
    `);

    // Validate the change
    const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    `);

    if (result.rows[0].count === '0') {
        throw new Error('Failed to add email_verified column');
    }

    console.log('[MIGRATION] ✅ email_verified column added successfully');
}
```

## Deployment Process

### Local Development
Migrations run automatically when you start the server:

```bash
npm start
# [DATABASE] Running database migrations...
# [MIGRATIONS] 🔍 Checking for pending migrations...
# [MIGRATIONS] 📋 No pending migrations
```

### Production Deployment

1. **Test Locally First**:
   ```bash
   DATABASE_URL="postgresql://preview-url..." npm start
   ```

2. **Deploy Code**: The migration runs automatically on first startup

3. **Monitor Logs**: Check Cloud Run logs for migration output:
   ```bash
   gcloud run services logs read --limit=50
   ```

4. **Verify Success**: Check the `schema_migrations` table:
   ```sql
   SELECT * FROM schema_migrations ORDER BY applied_at DESC;
   ```

## Troubleshooting

### Migration Fails
If a migration fails, it will be rolled back automatically:

```
[MIGRATIONS] ❌ Failed migration 20241110_001: column "duplicate_name" already exists
[MIGRATIONS] 💥 Migration system failed: error: column "duplicate_name" already exists
```

**Resolution**:
1. Fix the migration file
2. Restart the server - it will retry the migration

### Migration Stuck
If a migration appears to hang:

```bash
# Check for locks in PostgreSQL
SELECT * FROM pg_locks WHERE granted = false;

# Check migration status
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

### Rollback Required
Currently manual - connect to database and:

```sql
-- Remove migration record
DELETE FROM schema_migrations WHERE version = '20241110_001';

-- Manually run down() migration logic
ALTER TABLE users DROP COLUMN problem_column;
```

## Schema Migration vs Data Migration

### Schema Migrations
- **Purpose**: Change table structure (ADD/DROP columns, indexes, constraints)
- **Timing**: Safe to run anytime
- **Rollback**: Usually possible

### Data Migrations
- **Purpose**: Transform or migrate existing data
- **Timing**: Consider data size and downtime
- **Rollback**: May be complex or impossible

### Combined Example

```javascript
async up(client) {
    // 1. Schema change
    await client.query(`
        ALTER TABLE users
        ADD COLUMN full_name TEXT
    `);

    // 2. Data migration
    await client.query(`
        UPDATE users
        SET full_name = CONCAT(first_name, ' ', last_name)
        WHERE first_name IS NOT NULL AND last_name IS NOT NULL
    `);

    // 3. Cleanup (optional)
    await client.query(`
        ALTER TABLE users
        DROP COLUMN IF EXISTS first_name,
        DROP COLUMN IF EXISTS last_name
    `);
}
```

## Next Steps for Phase B

When ready to add Phase B features, create migrations like:

```javascript
// 20241115_001_add_phase_b_columns.js
async up(client) {
    await client.query(`
        ALTER TABLE game_sessions
        ADD COLUMN starting_mass INTEGER,
        ADD COLUMN performance_pct REAL,
        ADD COLUMN exit_reason TEXT
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_performance
        ON game_sessions(performance_pct DESC)
    `);
}
```

## Migration System Architecture

### Files Structure
```
src/server/db/migrations/
├── runner.js                    # Migration execution engine
├── 20241110_001_example.js      # Migration files (YYYYMMDD_NNN_name.js)
├── 20241115_001_phase_b.js
└── 20241120_001_user_features.js
```

### Database Schema
```sql
CREATE TABLE schema_migrations (
    version VARCHAR(14) PRIMARY KEY,     -- '20241110_001'
    name VARCHAR(255) NOT NULL,          -- 'add_user_preferences'
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(32)                 -- Future: verify file integrity
);
```

This migration system provides a solid foundation for managing database schema changes safely and consistently across all environments.