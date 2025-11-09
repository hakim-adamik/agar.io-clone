const dbLayer = require('../src/server/db/database-layer');
const StatsRepository = require('../src/server/repositories/stats-repository');

async function testRanking() {
    console.log('🏆 Testing user ranking calculation...\n');
    console.log('Database Type:', dbLayer.isVercel ? 'Neon Postgres ✅' : 'SQLite');

    try {
        // Get all users
        const users = await dbLayer.query('SELECT id, username FROM users ORDER BY id');
        console.log(`Found ${users.rows.length} users:\n`);

        // Test ranking for each user
        for (const user of users.rows) {
            try {
                const rank = await StatsRepository.getUserRank(user.id);
                console.log(`${user.username} (ID: ${user.id})`);
                console.log(`  Rank: ${rank || 'Unranked'}`);

                // Get their stats for comparison
                const stats = await dbLayer.get('SELECT highest_mass, games_played FROM game_stats WHERE user_id = $1', [user.id]);
                if (stats) {
                    console.log(`  Highest Mass: ${stats.highest_mass}`);
                    console.log(`  Games Played: ${stats.games_played}`);
                } else {
                    console.log(`  No stats found`);
                }
                console.log('');
            } catch (error) {
                console.error(`  ❌ Error getting rank for ${user.username}:`, error.message);
                console.log('');
            }
        }

        // Show how leaderboard compares
        console.log('📊 Leaderboard order:');
        const leaderboard = await dbLayer.query(`
            SELECT u.id, u.username, COALESCE(gs.highest_mass, 0) as highest_mass
            FROM users u
            LEFT JOIN game_stats gs ON u.id = gs.user_id
            WHERE u.is_banned IS NULL OR u.is_banned = FALSE
            ORDER BY gs.highest_mass DESC NULLS LAST
        `);

        leaderboard.rows.forEach((entry, idx) => {
            console.log(`  ${idx + 1}. ${entry.username}: ${entry.highest_mass} mass`);
        });

    } catch (error) {
        console.error('❌ Error during ranking test:', error);
    } finally {
        dbLayer.close();
        process.exit(0);
    }
}

// Run with Postgres URL if provided
if (process.argv[2]) {
    process.env.POSTGRES_URL = process.argv[2];
}

testRanking();