const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../../config');

const sqlInfo = config.sqlinfo;
const dbPath = path.join(__dirname, 'db', sqlInfo.fileName);

// Ensure the database folder exists
const dbFolder = path.dirname(dbPath);
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
  console.log(`Created the database folder: ${dbFolder}`);
}

// Create the database connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Connected to the SQLite database.');

    // Perform any necessary table creations
    db.serialize(() => {
      // Existing tables
      db.run(`CREATE TABLE IF NOT EXISTS failed_login_attempts (
        username TEXT,
        ip_address TEXT
      )`, (err) => {
        if (err) {
          console.error(err);
        }
        else {
          console.log("Created failed_login_attempts table");
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        username TEXT,
        message TEXT,
        ip_address TEXT,
        timestamp INTEGER
      )`, (err) => {
        if (err) {
          console.error(err);
        }
        else {
          console.log("Created chat_messages table");
        }
      });

      // Phase A: User Authentication & Profile Tables

      // Users table - Core user profiles linked to Privy authentication
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        privy_id TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        auth_provider TEXT,
        avatar_url TEXT,
        bio TEXT,
        region TEXT,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        is_banned INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        CONSTRAINT username_length CHECK(length(username) >= 3 AND length(username) <= 25)
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
        } else {
          console.log("Created users table");
          // Create indexes for users table
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)`);
        }
      });

      // Game Statistics table - Cumulative gameplay stats (Phase A columns only)
      db.run(`CREATE TABLE IF NOT EXISTS game_stats (
        user_id INTEGER PRIMARY KEY,
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
        last_game_at INTEGER,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating game_stats table:', err);
        } else {
          console.log("Created game_stats table");
          // Create indexes for game_stats table
          db.run(`CREATE INDEX IF NOT EXISTS idx_stats_highest_mass ON game_stats(highest_mass DESC)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_stats_total_kills ON game_stats(total_kills DESC)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_stats_games_played ON game_stats(games_played DESC)`);
        }
      });

      // Game Sessions table - Individual game history (Phase A columns only)
      db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        arena_id TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration INTEGER,
        final_mass INTEGER,
        highest_mass INTEGER,
        final_rank INTEGER,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        splits INTEGER DEFAULT 0,
        ejects INTEGER DEFAULT 0,
        viruses_popped INTEGER DEFAULT 0,
        was_top_3 INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating game_sessions table:', err);
        } else {
          console.log("Created game_sessions table");
          // Create indexes for game_sessions table
          db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON game_sessions(user_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON game_sessions(started_at DESC)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_highest_mass ON game_sessions(highest_mass DESC)`);
        }
      });

      // User Preferences table - Stores user-specific game settings
      db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        dark_mode INTEGER DEFAULT 1,
        show_mass INTEGER DEFAULT 1,
        show_border INTEGER DEFAULT 1,
        show_grid INTEGER DEFAULT 1,
        continuity INTEGER DEFAULT 1,
        round_food INTEGER DEFAULT 1,
        show_fps INTEGER DEFAULT 0,
        chat_enabled INTEGER DEFAULT 1,
        sound_enabled INTEGER DEFAULT 1,
        volume INTEGER DEFAULT 50,
        skin_id INTEGER,
        language TEXT DEFAULT 'en',
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT volume_range CHECK(volume >= 0 AND volume <= 100)
      )`, (err) => {
        if (err) {
          console.error('Error creating user_preferences table:', err);
        } else {
          console.log("Created user_preferences table");
        }
      });

      // Leaderboard table - Persistent global leaderboard
      db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        score INTEGER NOT NULL,
        rank_position INTEGER NOT NULL,
        achieved_at INTEGER NOT NULL,
        is_current INTEGER DEFAULT 1,
        period_type TEXT DEFAULT 'all_time',
        period_start INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating leaderboard table:', err);
        } else {
          console.log("Created leaderboard table");
          // Create indexes for leaderboard table
          db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_current ON leaderboard(is_current, period_type, score DESC)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id, achieved_at DESC)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period_type, period_start, score DESC)`);
        }
      });
    });
  }
});

process.on('beforeExit', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database connection. ', err);
    } else {
      console.log('Closed the database connection.');
    }
  });
});

module.exports = db;
