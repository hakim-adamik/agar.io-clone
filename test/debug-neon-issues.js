const dbLayer = require('../src/server/db/database-layer');

async function debugDatabaseIssues() {
    console.log('🔍 Debugging Neon Database Issues...\n');
    console.log('Database Type:', dbLayer.isVercel ? 'Neon Postgres ✅' : 'SQLite');

    try {
        // Test 1: Check users table
        console.log('1️⃣  Checking users in database:');
        const users = await dbLayer.query('SELECT id, username, privy_id FROM users');
        console.log(`   Found ${users.rows.length} users:`);
        users.rows.forEach(user => {
            console.log(`   - ID: ${user.id}, Username: ${user.username}`);
        });

        // Test 2: Check COUNT query format
        console.log('\n2️⃣  Testing COUNT query (username availability):');
        const testUsername = users.rows.length > 0 ? users.rows[0].username : 'testuser';
        const countResult = await dbLayer.get(`SELECT COUNT(*) as count FROM users WHERE username = $1`, [testUsername]);
        console.log(`   COUNT result for "${testUsername}":`, countResult);
        console.log(`   Type of count:`, typeof countResult.count);
        console.log(`   Count value:`, countResult.count);
        console.log(`   Is zero?:`, countResult.count === 0, '(strict)');
        console.log(`   Is zero?:`, countResult.count == 0, '(loose)');
        console.log(`   Parsed as int:`, parseInt(countResult.count));

        // Test 3: Check game_stats table
        console.log('\n3️⃣  Checking game_stats for leaderboard:');
        const stats = await dbLayer.query('SELECT user_id, highest_mass FROM game_stats WHERE highest_mass > 0');
        console.log(`   Found ${stats.rows.length} users with stats`);

        // Test 4: Check leaderboard query
        console.log('\n4️⃣  Testing leaderboard query:');
        const leaderboardQuery = `
            SELECT
                u.id,
                u.username,
                COALESCE(gs.highest_mass, 0) as highest_mass,
                COALESCE(gs.games_played, 0) as games_played
            FROM users u
            LEFT JOIN game_stats gs ON u.id = gs.user_id
            ORDER BY gs.highest_mass DESC NULLS LAST
            LIMIT 10
        `;
        const leaderboard = await dbLayer.query(leaderboardQuery);
        console.log(`   Leaderboard entries: ${leaderboard.rows.length}`);
        leaderboard.rows.forEach((entry, idx) => {
            console.log(`   ${idx + 1}. ${entry.username}: ${entry.highest_mass} mass (${entry.games_played} games)`);
        });

        // Test 5: Check if stats are being initialized
        console.log('\n5️⃣  Checking if game_stats rows exist for users:');
        const userStatsCheck = await dbLayer.query(`
            SELECT u.id, u.username,
                   CASE WHEN gs.user_id IS NULL THEN 'No stats' ELSE 'Has stats' END as status
            FROM users u
            LEFT JOIN game_stats gs ON u.id = gs.user_id
        `);
        userStatsCheck.rows.forEach(row => {
            console.log(`   User ${row.username} (ID: ${row.id}): ${row.status}`);
        });

    } catch (error) {
        console.error('❌ Error during debugging:', error);
    } finally {
        dbLayer.close();
        process.exit(0);
    }
}

// Run with Postgres URL if provided
if (process.argv[2]) {
    process.env.POSTGRES_URL = process.argv[2];
}

debugDatabaseIssues();