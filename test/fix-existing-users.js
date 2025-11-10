const { Pool } = require('pg');

// Create pool with same configuration as sql.js
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function fixExistingUsers() {
    console.log('🔧 Fixing existing users without stats...\n');
    console.log('Database Type: PostgreSQL (Neon) ✅');
    console.log('Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');

    try {
        // Find users without stats
        const usersWithoutStats = await pool.query(`
            SELECT u.id, u.username
            FROM users u
            LEFT JOIN game_stats gs ON u.id = gs.user_id
            WHERE gs.user_id IS NULL
        `);

        console.log(`Found ${usersWithoutStats.rows.length} users without stats:`);

        for (const user of usersWithoutStats.rows) {
            console.log(`  - ${user.username} (ID: ${user.id})`);

            try {
                // Initialize stats for this user
                await pool.query(
                    `INSERT INTO game_stats (user_id, games_played, total_mass_eaten, total_players_eaten,
                     total_playtime, highest_mass, longest_survival, updated_at)
                     VALUES ($1, 0, 0, 0, 0, 0, 0, $2)`,
                    [user.id, Date.now()]
                );
                console.log(`    ✅ Created stats for ${user.username}`);
            } catch (err) {
                console.error(`    ❌ Failed to create stats for ${user.username}:`, err.message);
            }
        }

        // Verify the fix
        console.log('\n📊 Verifying leaderboard now shows data:');
        const leaderboard = await pool.query(`
            SELECT
                u.id,
                u.username,
                COALESCE(gs.highest_mass, 0) as highest_mass,
                COALESCE(gs.games_played, 0) as games_played
            FROM users u
            LEFT JOIN game_stats gs ON u.id = gs.user_id
            ORDER BY gs.highest_mass DESC NULLS LAST
            LIMIT 10
        `);

        console.log(`Leaderboard entries: ${leaderboard.rows.length}`);
        leaderboard.rows.forEach((entry, idx) => {
            console.log(`  ${idx + 1}. ${entry.username}: ${entry.highest_mass} mass (${entry.games_played} games)`);
        });

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// Run with DATABASE_URL if provided
if (process.argv[2]) {
    process.env.DATABASE_URL = process.argv[2];
}

fixExistingUsers();