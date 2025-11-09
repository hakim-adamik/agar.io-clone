const dbLayer = require('../src/server/db/database-layer');

async function testConnection() {
    console.log('Testing Neon Postgres connection...');
    console.log('Using Postgres:', dbLayer.isVercel ? 'Yes ✅' : 'No (SQLite fallback)');

    try {
        // Test basic query
        const result = await dbLayer.query('SELECT 1 as test');
        console.log('✅ Database connection successful!');
        console.log('Test query result:', result.rows[0]);

        // Check if tables exist
        const tablesQuery = dbLayer.isVercel
            ? "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            : "SELECT name FROM sqlite_master WHERE type='table'";

        const tables = await dbLayer.query(tablesQuery);
        console.log('\n📊 Existing tables:', tables.rows.length);
        tables.rows.forEach(table => {
            console.log('  -', dbLayer.isVercel ? table.tablename : table.name);
        });

        // Test creating tables
        console.log('\n🔨 Initializing database tables...');
        await dbLayer.initializeTables();
        console.log('✅ Tables initialized successfully!');

        // Check tables again
        const tablesAfter = await dbLayer.query(tablesQuery);
        console.log('\n📊 Tables after initialization:', tablesAfter.rows.length);
        tablesAfter.rows.forEach(table => {
            console.log('  -', dbLayer.isVercel ? table.tablename : table.name);
        });

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        dbLayer.close();
        process.exit(0);
    }
}

testConnection();