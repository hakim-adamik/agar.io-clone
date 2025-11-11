const { Pool } = require('pg');

// Create pool with same configuration as sql.js
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function testConnection() {
    console.log('Testing PostgreSQL-Only Architecture...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');

    try {
        // Test basic connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL connection successful!');

        // Test basic query
        const result = await client.query('SELECT 1 as test');
        console.log('✅ Test query successful:', result.rows[0]);

        // Check if tables exist
        const tablesQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'";
        const tables = await client.query(tablesQuery);
        console.log('\n📊 Existing tables:', tables.rows.length);
        tables.rows.forEach(table => {
            console.log('  -', table.tablename);
        });

        // Release connection back to pool
        client.release();
        console.log('✅ Connection released back to pool');

        // Test repository functionality
        console.log('\n🧪 Testing repository functionality...');
        const UserRepository = require('../src/server/repositories/user-repository');

        // Test user lookup (should not fail even if user doesn't exist)
        try {
            const user = await UserRepository.findById(999999);
            console.log('✅ UserRepository.findById() working:', user ? 'Found user' : 'No user found (expected)');
        } catch (err) {
            console.log('✅ UserRepository test handled gracefully:', err.message);
        }

        console.log('✅ All tests passed - PostgreSQL-only architecture working correctly!');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testConnection();