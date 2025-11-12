const { Pool } = require('pg');

// Database connection configuration
const connectionString = process.env.DATABASE_URL;

// Log the DATABASE_URL status
if (!connectionString) {
    console.log('[DATABASE] DATABASE_URL not set - game will run without database features');
}

// Only create pool if DATABASE_URL is set
const pool = connectionString ? new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long to keep clients in pool
    connectionTimeoutMillis: 2000, // How long to wait for connection
}) : null;

// Create all necessary tables
async function initializeTables() {
    // Skip if no database connection
    if (!pool) {
        console.log('[DATABASE] Skipping database initialization - no DATABASE_URL');
        return;
    }

    const client = await pool.connect();
    try {
        console.log('[DATABASE] Connected to PostgreSQL database');

        // 🚨 WARNING: SCHEMA MODIFICATION PROTECTION 🚨
        // This function should NEVER be modified for schema changes in production!
        // ALL schema modifications must go through migrations in src/server/db/migrations/
        //
        // If you need to change the database schema:
        // 1. Run: npm run migration:create your_change_name
        // 2. Edit the generated migration file
        // 3. Restart server - migration runs automatically
        //
        // Editing this file for schema changes will cause deployment issues!
        console.log('[DATABASE] ⚠️  Schema changes must use migrations - NOT this file!');

        // Existing tables
        await client.query(`CREATE TABLE IF NOT EXISTS failed_login_attempts (
            username TEXT,
            ip_address TEXT
        )`);
        console.log('[DATABASE] Created failed_login_attempts table');

        await client.query(`CREATE TABLE IF NOT EXISTS chat_messages (
            username TEXT,
            message TEXT,
            ip_address TEXT,
            timestamp BIGINT
        )`);
        console.log('[DATABASE] Created chat_messages table');

        // Phase A: User Authentication & Profile Tables

        // Users table - Core user profiles linked to Privy authentication
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            privy_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            auth_provider TEXT,
            avatar_url TEXT,
            bio TEXT,
            region TEXT,
            created_at BIGINT NOT NULL,
            last_seen BIGINT NOT NULL,
            is_banned BOOLEAN DEFAULT FALSE,
            is_premium BOOLEAN DEFAULT FALSE,
            CONSTRAINT username_length CHECK(length(username) >= 3 AND length(username) <= 25)
        )`);
        console.log('[DATABASE] Created users table');

        // Create indexes for users table
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)`);

        // Game Statistics table - Cumulative gameplay stats
        await client.query(`CREATE TABLE IF NOT EXISTS game_stats (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            games_played INTEGER DEFAULT 0,
            total_playtime INTEGER DEFAULT 0,
            total_mass_eaten INTEGER DEFAULT 0,
            total_kills INTEGER DEFAULT 0,
            total_players_eaten INTEGER DEFAULT 0,
            total_deaths INTEGER DEFAULT 0,
            highest_mass INTEGER DEFAULT 0,
            highest_rank INTEGER DEFAULT 0,
            total_splits INTEGER DEFAULT 0,
            total_ejects INTEGER DEFAULT 0,
            cells_merged INTEGER DEFAULT 0,
            viruses_popped INTEGER DEFAULT 0,
            longest_survival INTEGER DEFAULT 0,
            avg_survival INTEGER DEFAULT 0,
            last_game_at BIGINT,
            updated_at BIGINT NOT NULL
        )`);
        console.log('[DATABASE] Created game_stats table');

        // Create indexes for game_stats table
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stats_highest_mass ON game_stats(highest_mass DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stats_total_kills ON game_stats(total_kills DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stats_games_played ON game_stats(games_played DESC)`);

        // Game Sessions table - Individual game history
        await client.query(`CREATE TABLE IF NOT EXISTS game_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            arena_id TEXT,
            started_at BIGINT NOT NULL,
            ended_at BIGINT,
            duration INTEGER,
            final_mass INTEGER,
            highest_mass INTEGER,
            final_rank INTEGER,
            kills INTEGER DEFAULT 0,
            deaths INTEGER DEFAULT 0,
            splits INTEGER DEFAULT 0,
            ejects INTEGER DEFAULT 0,
            viruses_popped INTEGER DEFAULT 0,
            was_top_3 BOOLEAN DEFAULT FALSE
        )`);
        console.log('[DATABASE] Created game_sessions table');

        // Create indexes for game_sessions table
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON game_sessions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON game_sessions(started_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_highest_mass ON game_sessions(highest_mass DESC)`);

        // User Preferences table - Stores user-specific game settings
        await client.query(`CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            dark_mode BOOLEAN DEFAULT TRUE,
            show_mass BOOLEAN DEFAULT TRUE,
            show_border BOOLEAN DEFAULT TRUE,
            show_grid BOOLEAN DEFAULT TRUE,
            continuity BOOLEAN DEFAULT TRUE,
            round_food BOOLEAN DEFAULT TRUE,
            show_fps BOOLEAN DEFAULT FALSE,
            chat_enabled BOOLEAN DEFAULT TRUE,
            sound_enabled BOOLEAN DEFAULT TRUE,
            volume INTEGER DEFAULT 50,
            skin_id INTEGER,
            language TEXT DEFAULT 'en',
            updated_at BIGINT NOT NULL,
            CONSTRAINT volume_range CHECK(volume >= 0 AND volume <= 100)
        )`);
        console.log('[DATABASE] Created user_preferences table');

        // Leaderboard table - Persistent global leaderboard
        await client.query(`CREATE TABLE IF NOT EXISTS leaderboard (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            username TEXT NOT NULL,
            score INTEGER NOT NULL,
            rank_position INTEGER NOT NULL,
            achieved_at BIGINT NOT NULL,
            is_current BOOLEAN DEFAULT TRUE,
            period_type TEXT DEFAULT 'all_time',
            period_start BIGINT
        )`);
        console.log('[DATABASE] Created leaderboard table');

        // Create indexes for leaderboard table
        await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboard_current ON leaderboard(is_current, period_type, score DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id, achieved_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period_type, period_start, score DESC)`);

        console.log('[DATABASE] All tables initialized successfully');

        // Run database migrations after initial table setup
        console.log('[DATABASE] Running database migrations...');
        const MigrationRunner = require('./db/migrations/runner');
        await MigrationRunner.runPendingMigrations();

    } catch (err) {
        console.error('[DATABASE] Error initializing tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Initialize tables on startup
initializeTables().catch(err => {
    console.error('[DATABASE] Failed to initialize database:', err);
    console.log('[DATABASE] Game will run without database features (no user accounts/stats)');
    // Don't exit - let the game run without database
});

// Export the pool for use in repositories
module.exports = pool;