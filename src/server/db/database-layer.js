// Remove unused import - using pg directly now
// const { sql: vercelSql } = require('@vercel/postgres');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseLayer {
  constructor() {
    // Check for any of the common Postgres environment variables
    this.isVercel = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    this.db = null;
    this.connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!this.isVercel) {
      this.initSqlite();
    }
  }

  initSqlite() {
    const dbPath = path.join(__dirname, 'db.sqlite3');
    const dbFolder = path.dirname(dbPath);

    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  }

  async query(text, params = []) {
    if (this.isVercel) {
      // Use the connection string directly
      const { Client } = require('pg');
      const client = new Client({
        connectionString: this.connectionString
      });
      await client.connect();
      try {
        const result = await client.query(text, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount
        };
      } finally {
        await client.end();
      }
    } else {
      // SQLite wrapper to match Postgres-style API
      return new Promise((resolve, reject) => {
        if (text.toLowerCase().startsWith('select') || text.toLowerCase().includes('returning')) {
          this.db.all(this.convertToSqlite(text), params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
          });
        } else {
          this.db.run(this.convertToSqlite(text), params, function(err) {
            if (err) reject(err);
            else resolve({
              rows: [{ id: this.lastID }],
              rowCount: this.changes
            });
          });
        }
      });
    }
  }

  async get(text, params = []) {
    if (this.isVercel) {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: this.connectionString
      });
      await client.connect();
      try {
        const result = await client.query(text, params);
        return result.rows[0] || null;
      } finally {
        await client.end();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.get(this.convertToSqlite(text), params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async run(text, params = []) {
    if (this.isVercel) {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: this.connectionString
      });
      await client.connect();
      try {
        const result = await client.query(text, params);
        return {
          lastID: result.rows[0]?.id,
          changes: result.rowCount
        };
      } finally {
        await client.end();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(this.convertToSqlite(text), params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  convertToSqlite(query) {
    // Convert PostgreSQL syntax to SQLite
    let sqliteQuery = query;

    // Replace $1, $2, etc. with ?
    sqliteQuery = sqliteQuery.replace(/\$(\d+)/g, '?');

    // Replace RETURNING with nothing (handle separately)
    sqliteQuery = sqliteQuery.replace(/\s+RETURNING\s+\*/gi, '');
    sqliteQuery = sqliteQuery.replace(/\s+RETURNING\s+\w+/gi, '');

    // Replace ON CONFLICT DO UPDATE with OR REPLACE
    sqliteQuery = sqliteQuery.replace(/ON CONFLICT\s*\([^)]+\)\s*DO UPDATE SET/gi, 'OR REPLACE');

    // Replace SERIAL with INTEGER for SQLite
    sqliteQuery = sqliteQuery.replace(/SERIAL\s+PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

    return sqliteQuery;
  }

  async initializeTables() {
    const queries = this.isVercel ? this.getPostgresSchema() : this.getSqliteSchema();

    for (const query of queries) {
      try {
        await this.run(query);
        console.log('Executed table creation query');
      } catch (err) {
        // Table might already exist, that's okay
        if (!err.message.includes('already exists')) {
          console.error('Error creating table:', err);
        }
      }
    }
  }

  getPostgresSchema() {
    return [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        privy_id TEXT UNIQUE NOT NULL,
        username VARCHAR(25) UNIQUE NOT NULL CHECK(length(username) >= 3),
        email TEXT,
        auth_provider TEXT,
        avatar_url TEXT,
        bio TEXT,
        region TEXT,
        created_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL,
        is_banned BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE
      )`,

      // Game stats table
      `CREATE TABLE IF NOT EXISTS game_stats (
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
      )`,

      // Game sessions table
      `CREATE TABLE IF NOT EXISTS game_sessions (
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
      )`,

      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
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
        volume INTEGER DEFAULT 50 CHECK(volume >= 0 AND volume <= 100),
        skin_id INTEGER,
        language VARCHAR(5) DEFAULT 'en',
        updated_at BIGINT NOT NULL
      )`,

      // Leaderboard table
      `CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        score INTEGER NOT NULL,
        rank_position INTEGER NOT NULL,
        achieved_at BIGINT NOT NULL,
        is_current BOOLEAN DEFAULT TRUE,
        period_type VARCHAR(20) DEFAULT 'all_time',
        period_start BIGINT
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
      `CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)`,
      `CREATE INDEX IF NOT EXISTS idx_stats_highest_mass ON game_stats(highest_mass DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_stats_total_kills ON game_stats(total_kills DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON game_sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON game_sessions(started_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_leaderboard_current ON leaderboard(is_current, period_type, score DESC)`
    ];
  }

  getSqliteSchema() {
    return [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,

      // Game stats table
      `CREATE TABLE IF NOT EXISTS game_stats (
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
      )`,

      // Game sessions table
      `CREATE TABLE IF NOT EXISTS game_sessions (
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
      )`,

      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
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
      )`,

      // Leaderboard table
      `CREATE TABLE IF NOT EXISTS leaderboard (
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
      )`,

      // Chat and login tables (legacy)
      `CREATE TABLE IF NOT EXISTS failed_login_attempts (
        username TEXT,
        ip_address TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS chat_messages (
        username TEXT,
        message TEXT,
        ip_address TEXT,
        timestamp INTEGER
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
      `CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)`,
      `CREATE INDEX IF NOT EXISTS idx_stats_highest_mass ON game_stats(highest_mass DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_stats_total_kills ON game_stats(total_kills DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON game_sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON game_sessions(started_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_leaderboard_current ON leaderboard(is_current, period_type, score DESC)`
    ];
  }

  close() {
    if (!this.isVercel && this.db) {
      this.db.close();
    }
  }
}

// Create singleton instance
const dbLayer = new DatabaseLayer();

// Initialize tables on startup
dbLayer.initializeTables().catch(console.error);

// Handle cleanup
process.on('beforeExit', () => {
  dbLayer.close();
});

module.exports = dbLayer;