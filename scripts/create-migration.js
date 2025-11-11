#!/usr/bin/env node

/*jslint node: true */
'use strict';

const fs = require('fs');
const path = require('path');

function createMigration(name) {
    if (!name) {
        console.error('❌ Migration name is required');
        console.log('\nUsage:');
        console.log('  node scripts/create-migration.js add_user_preferences');
        console.log('  node scripts/create-migration.js "add user preferences"');
        process.exit(1);
    }

    // Clean and format the name
    const cleanName = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');

    // Generate timestamp and version
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[-:T]/g, '')
        .slice(0, 8); // YYYYMMDD

    // Simple counter for same-day migrations (could be enhanced)
    const counter = '001';
    const version = `${timestamp}_${counter}`;
    const filename = `${version}_${cleanName}.js`;

    const migrationsDir = path.join(__dirname, '..', 'src', 'server', 'db', 'migrations');
    const filepath = path.join(migrationsDir, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
        console.error(`❌ Migration file already exists: ${filename}`);
        console.log('💡 Try using a different name or increment the counter manually');
        process.exit(1);
    }

    const template = `/*jslint node: true */
'use strict';

/**
 * Migration: ${cleanName}
 * Created: ${now.toISOString()}
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

        console.log('[MIGRATION] ${cleanName}: Add your migration logic here');
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

        console.log('[MIGRATION] ${cleanName}: Add rollback logic here (optional)');
    }
};
`;

    try {
        fs.writeFileSync(filepath, template);
        console.log('✅ Created migration:', filename);
        console.log('📍 Location:', filepath);
        console.log('\n📝 Next steps:');
        console.log('  1. Edit the migration file to add your SQL changes');
        console.log('  2. Test the migration locally');
        console.log('  3. Restart the server to apply the migration');
        console.log('\n💡 Migration will run automatically on server startup');
    } catch (err) {
        console.error('❌ Failed to create migration file:', err.message);
        process.exit(1);
    }
}

// Get migration name from command line
const migrationName = process.argv[2];
createMigration(migrationName);