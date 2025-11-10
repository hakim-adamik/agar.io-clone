#!/usr/bin/env node

/**
 * Test script to verify database integration
 * Run this after the server is started to test the API endpoints
 */

const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:8080';

async function testDatabaseIntegration() {
    console.log('🧪 Testing Database Integration...\n');

    try {
        // Test 1: Authenticate a test user
        console.log('1️⃣ Testing /api/auth endpoint...');
        const authResponse = await fetch(`${BASE_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                privyId: 'test_user_123',
                email: 'test@example.com',
                username: 'TestPlayer',
                authProvider: 'email',
                avatarUrl: null
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Auth failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        console.log('✅ Auth successful:', {
            userId: authData.user.id,
            username: authData.user.username,
            stats: authData.stats
        });

        const userId = authData.user.id;

        // Test 2: Get user profile
        console.log('\n2️⃣ Testing /api/user/:userId endpoint...');
        const profileResponse = await fetch(`${BASE_URL}/api/user/${userId}`);

        if (!profileResponse.ok) {
            throw new Error(`Profile fetch failed: ${profileResponse.status}`);
        }

        const profileData = await profileResponse.json();
        console.log('✅ Profile fetched:', {
            username: profileData.user.username,
            gamesPlayed: profileData.stats.games_played,
            highScore: profileData.stats.high_score
        });

        // Test 3: Get user preferences
        console.log('\n3️⃣ Testing /api/user/:userId/preferences endpoint...');
        const prefsResponse = await fetch(`${BASE_URL}/api/user/${userId}/preferences`);

        if (!prefsResponse.ok) {
            throw new Error(`Preferences fetch failed: ${prefsResponse.status}`);
        }

        const prefsData = await prefsResponse.json();
        console.log('✅ Preferences fetched:', prefsData);

        // Test 4: Update preferences
        console.log('\n4️⃣ Testing preferences update...');
        const updatePrefsResponse = await fetch(`${BASE_URL}/api/user/${userId}/preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                darkMode: false,
                showFps: true
            })
        });

        if (!updatePrefsResponse.ok) {
            throw new Error(`Preferences update failed: ${updatePrefsResponse.status}`);
        }

        console.log('✅ Preferences updated successfully');

        // Test 5: Get leaderboard
        console.log('\n5️⃣ Testing /api/leaderboard endpoint...');
        const leaderboardResponse = await fetch(`${BASE_URL}/api/leaderboard?limit=5`);

        if (!leaderboardResponse.ok) {
            throw new Error(`Leaderboard fetch failed: ${leaderboardResponse.status}`);
        }

        const leaderboardData = await leaderboardResponse.json();
        console.log('✅ Leaderboard fetched:', leaderboardData.length, 'entries');

        console.log('\n🎉 All tests passed! Database integration is working.\n');
        console.log('📝 Next steps to test in browser:');
        console.log('1. Open http://localhost:8080');
        console.log('2. Click "Sign In" and authenticate with Privy');
        console.log('3. Check browser console for "[Auth] Database user created/updated" message');
        console.log('4. Profile modal should show real stats (initially 0)');
        console.log('5. Play a game and stats should update on disconnect');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Make sure:');
        console.log('- Server is running on port 8080');
        console.log('- Database tables are created');
        console.log('- API endpoints are accessible');
    }
}

// Run the test
testDatabaseIntegration();