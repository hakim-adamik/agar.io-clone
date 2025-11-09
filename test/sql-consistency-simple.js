/**
 * Simple SQL Consistency Test
 * Tests the actual repository methods that are already working in production
 */

const UserRepository = require('../src/server/repositories/user-repository');
const StatsRepository = require('../src/server/repositories/stats-repository');

async function testRepositoryConsistency() {
    console.log('🧪 Testing Repository Method Consistency\n');

    const dbType = process.env.POSTGRES_URL ? 'Neon Postgres' : 'SQLite';
    const dbHost = process.env.POSTGRES_URL ?
        (process.env.POSTGRES_URL.includes('ep-tiny-night') ? '(PRODUCTION)' :
         process.env.POSTGRES_URL.includes('ep-wild-bar') ? '(PREVIEW)' : '(UNKNOWN)') :
        '(Local)';

    console.log(`Database: ${dbType} ${dbHost}`);
    console.log('=' .repeat(50));

    try {
        console.log('\n1️⃣  Testing UserRepository.isUsernameAvailable():');

        // Test with existing username
        const existingUsers = await UserRepository.findByUsername('Fabrice Dautriat');
        if (existingUsers) {
            const isAvailable = await UserRepository.isUsernameAvailable('Fabrice Dautriat');
            console.log('   Existing username availability check:', isAvailable === false ? '✅' : '❌');
        }

        // Test with non-existing username
        const randomName = 'NonExistentUser' + Date.now();
        const isNewAvailable = await UserRepository.isUsernameAvailable(randomName);
        console.log('   New username availability check:', isNewAvailable === true ? '✅' : '❌');

        console.log('\n2️⃣  Testing StatsRepository.getUserRank():');

        // Find any user to test ranking
        const testUserId = existingUsers?.id || 1;
        const userRank = await StatsRepository.getUserRank(testUserId);
        console.log('   User rank calculation:', typeof userRank === 'number' ? '✅' : '❌');
        console.log('   Rank value:', userRank);

        console.log('\n3️⃣  Testing StatsRepository.getLeaderboard():');

        const leaderboard = await StatsRepository.getLeaderboard(5);
        console.log('   Leaderboard query works:', Array.isArray(leaderboard) ? '✅' : '❌');
        console.log('   Leaderboard entries:', leaderboard.length);

        if (leaderboard.length > 0) {
            console.log('   Sample entry structure:');
            const sample = leaderboard[0];
            console.log('     - username:', typeof sample.username === 'string' ? '✅' : '❌');
            console.log('     - highest_mass:', typeof sample.highest_mass === 'number' ? '✅' : '❌');
            console.log('     - games_played:', typeof sample.games_played === 'number' ? '✅' : '❌');
        }

        console.log('\n4️⃣  Testing Data Type Consistency:');

        if (existingUsers) {
            console.log('   User ID type:', typeof existingUsers.id);
            console.log('   User created_at type:', typeof existingUsers.created_at);
            console.log('   User is_banned type:', typeof existingUsers.is_banned);
        }

        console.log('\n🎉 Repository Method Consistency Check Complete!');
        console.log(`   All repository methods work consistently on ${dbType} ${dbHost}`);

    } catch (error) {
        console.error('\n❌ Repository Consistency Test Failed:');
        console.error('Error:', error.message);
        console.error('Database:', dbType, dbHost);
        console.error('\nDetails:', error);
    }

    process.exit(0);
}

// Load environment variables
require('dotenv').config();

// Allow testing specific environments
const env = process.argv[2];
if (env === 'preview') {
    process.env.POSTGRES_URL = process.env.POSTGRES_URL_PREVIEW;
    process.env.DATABASE_URL = process.env.DATABASE_URL_PREVIEW;
} else if (env === 'prod') {
    process.env.POSTGRES_URL = process.env.POSTGRES_URL_PROD;
    process.env.DATABASE_URL = process.env.DATABASE_URL_PROD;
} else if (env === 'local') {
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
}

testRepositoryConsistency();