# Database Design & Implementation Guide

## Overview

This document outlines the database architecture for user data persistence, authentication integration, and gameplay statistics tracking for the Agar.io clone.

---

## Current State

### ✅ Existing Infrastructure

**Database Setup:**
- SQLite3 database configured and working
- Location: `src/server/db/db.sqlite3`
- Connection management: `src/server/sql.js`
- Auto-creation of database folder on startup
- Graceful shutdown handling

**Existing Tables:**
- `failed_login_attempts` - Security logging
- `chat_messages` - Chat history with timestamps

**Existing Repositories:**
- `src/server/repositories/logging-repository.js` - Failed login tracking
- `src/server/repositories/chat-repository.js` - Chat message logging

### ❌ What's Missing

- **User profiles** - No persistent user data
- **Game statistics** - Stats only exist during gameplay
- **Leaderboard persistence** - Only in-memory, resets on server restart
- **User preferences** - Settings not saved between sessions
- **Privy integration** - No link between Privy auth and user profiles
- **Match history** - No game session tracking

---

## Proposed Database Schema

### 1. Users Table

Stores user profiles linked to Privy authentication.

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  privy_id TEXT UNIQUE NOT NULL,           -- Privy authentication ID
  username TEXT UNIQUE NOT NULL,            -- Display name (changeable)
  email TEXT,                               -- From Privy (if available)
  auth_provider TEXT,                       -- 'google', 'discord', 'email', 'wallet'
  avatar_url TEXT,                          -- Profile picture URL
  bio TEXT,                                 -- User bio/description
  region TEXT,                              -- Geographic region
  created_at INTEGER NOT NULL,              -- Unix timestamp (ms)
  last_seen INTEGER NOT NULL,               -- Unix timestamp (ms)
  is_banned BOOLEAN DEFAULT 0,              -- Moderation flag
  is_premium BOOLEAN DEFAULT 0,             -- Future premium features
  CONSTRAINT username_length CHECK(length(username) >= 3 AND length(username) <= 25)
);

CREATE INDEX idx_users_privy_id ON users(privy_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_last_seen ON users(last_seen);
```

**Design Notes:**
- `privy_id` is the source of truth for authentication
- `username` can be changed but must be unique
- Supports multiple auth providers (Google, Discord, Email, Wallet)
- Timestamps in milliseconds for consistency with existing code
- Indexes on frequently queried fields

---

### 2. Game Statistics Table

Tracks cumulative gameplay performance.

```sql
CREATE TABLE IF NOT EXISTS game_stats (
  user_id INTEGER PRIMARY KEY,
  
  -- Basic gameplay stats
  games_played INTEGER DEFAULT 0,           -- Total games
  total_playtime INTEGER DEFAULT 0,         -- Total minutes played
  total_mass_eaten INTEGER DEFAULT 0,       -- Cumulative mass eaten
  total_kills INTEGER DEFAULT 0,            -- Cells eaten
  total_deaths INTEGER DEFAULT 0,           -- Times eaten
  highest_mass INTEGER DEFAULT 0,           -- Personal best mass
  highest_rank INTEGER DEFAULT 0,           -- Best leaderboard position (1-10)
  total_splits INTEGER DEFAULT 0,           -- Times split
  total_ejects INTEGER DEFAULT 0,           -- Times ejected mass
  cells_merged INTEGER DEFAULT 0,           -- Successful merges
  viruses_popped INTEGER DEFAULT 0,         -- Viruses destroyed
  longest_survival INTEGER DEFAULT 0,       -- Longest game in seconds
  avg_survival INTEGER DEFAULT 0,           -- Average game duration
  
  -- Win/Loss tracking (analytics-focused)
  total_wins INTEGER DEFAULT 0,             -- Games with performance_pct > 10
  total_losses INTEGER DEFAULT 0,           -- Games eaten
  total_cashouts INTEGER DEFAULT 0,         -- Voluntary exits (Escape key)
  early_losses INTEGER DEFAULT 0,           -- Eaten before reaching 110%
  win_rate REAL DEFAULT 0,                  -- wins / (wins + losses)
  
  -- Performance metrics
  avg_performance_pct REAL DEFAULT 0,       -- Average % gain/loss per game
  best_performance_pct REAL DEFAULT 0,      -- Best % gain in a single game
  worst_performance_pct REAL DEFAULT 0,     -- Worst % loss in a single game
  total_performance_pct REAL DEFAULT 0,     -- Cumulative performance across all games
  
  -- Streaks
  win_streak INTEGER DEFAULT 0,             -- Current win streak
  best_win_streak INTEGER DEFAULT 0,        -- Best win streak
  loss_streak INTEGER DEFAULT 0,            -- Current loss streak (for fairness analysis)
  
  -- Retention behavior tracking
  games_after_win INTEGER DEFAULT 0,        -- Times played again after winning
  games_after_loss INTEGER DEFAULT 0,       -- Times played again after losing
  
  -- Money-based gameplay (future)
  total_deposited REAL DEFAULT 0,           -- Total money brought in (future)
  total_withdrawn REAL DEFAULT 0,           -- Total money cashed out (future)
  net_profit REAL DEFAULT 0,                -- total_withdrawn - total_deposited (future)
  biggest_win REAL DEFAULT 0,               -- Largest single-game profit (future)
  biggest_loss REAL DEFAULT 0,              -- Largest single-game loss (future)
  
  -- Timestamps
  last_game_at INTEGER,                     -- Last game timestamp
  last_win_at INTEGER,                      -- Last win timestamp
  last_loss_at INTEGER,                     -- Last loss timestamp
  updated_at INTEGER NOT NULL,              -- Last stats update
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_stats_highest_mass ON game_stats(highest_mass DESC);
CREATE INDEX idx_stats_total_kills ON game_stats(total_kills DESC);
CREATE INDEX idx_stats_games_played ON game_stats(games_played DESC);
CREATE INDEX idx_stats_win_rate ON game_stats(win_rate DESC);
CREATE INDEX idx_stats_total_performance ON game_stats(total_performance_pct DESC);
CREATE INDEX idx_stats_net_profit ON game_stats(net_profit DESC);
```

**Design Notes:**
- **Analytics-focused:** Tracks wins, losses, cashouts, and performance percentages
- **Fairness metrics:** `early_losses`, `loss_streak` for spawn balance analysis
- **Retention tracking:** `games_after_win` vs `games_after_loss` for behavioral analysis
- **Money-ready:** Fields for real-money gameplay (deposits, withdrawals, profit/loss)
- **Performance-based:** Uses % metrics (not just absolute values) for fair comparison
- **Win definition:** `performance_pct > 10` = win (gaining 10%+ mass)

---

### 3. Game Sessions Table

Tracks individual game sessions for match history and analytics.

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at INTEGER NOT NULL,              -- Game start timestamp
  ended_at INTEGER,                         -- Game end timestamp (NULL if ongoing)
  duration INTEGER,                         -- Duration in seconds
  
  -- Mass tracking
  starting_mass INTEGER NOT NULL,           -- Mass at spawn (usually 10)
  final_mass INTEGER,                       -- Mass at end of game
  highest_mass INTEGER,                     -- Peak mass during game
  performance_pct REAL,                     -- (final_mass / starting_mass - 1) * 100
  
  -- Money-based gameplay (future: replace mass with real money)
  entry_amount REAL DEFAULT 0,              -- Money brought into game (future)
  exit_amount REAL DEFAULT 0,               -- Money taken out of game (future)
  net_profit REAL DEFAULT 0,                -- exit_amount - entry_amount (future)
  
  -- Exit mechanics
  exit_reason TEXT CHECK(exit_reason IN ('cashed_out', 'eaten', 'disconnected')),
  reached_110_pct BOOLEAN DEFAULT 0,        -- Did player reach 110% growth before exit?
  
  -- Gameplay stats
  final_rank INTEGER,                       -- Leaderboard position at end (1-10)
  kills INTEGER DEFAULT 0,                  -- Cells eaten this game
  deaths INTEGER DEFAULT 0,                 -- Times died (usually 0 or 1)
  splits INTEGER DEFAULT 0,                 -- Splits performed
  ejects INTEGER DEFAULT 0,                 -- Mass ejections
  viruses_popped INTEGER DEFAULT 0,         -- Viruses destroyed
  
  -- Win/loss classification
  is_win BOOLEAN DEFAULT 0,                 -- performance_pct > 10 (gained 10%+)
  is_early_loss BOOLEAN DEFAULT 0,          -- Eaten before reaching 110% mass
  was_top_3 BOOLEAN DEFAULT 0,              -- Finished in top 3
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_sessions_started_at ON game_sessions(started_at DESC);
CREATE INDEX idx_sessions_highest_mass ON game_sessions(highest_mass DESC);
CREATE INDEX idx_sessions_performance ON game_sessions(performance_pct DESC);
CREATE INDEX idx_sessions_exit_reason ON game_sessions(exit_reason);
CREATE INDEX idx_sessions_is_win ON game_sessions(is_win, user_id);
```

**Design Notes:**
- **Performance tracking:** `performance_pct` is key metric for win/loss (not absolute mass)
- **Exit mechanics:** Supports cash-out (Escape key), being eaten, or disconnect
- **Money-based gameplay:** Fields ready for real-money integration (entry_amount, exit_amount, net_profit)
- **Analytics-focused:** `is_win`, `is_early_loss`, `reached_110_pct` for fairness analysis
- **Win definition:** `performance_pct > 10` (gained 10%+) = successful game
- **Early loss detection:** Tracks if eaten before growing (spawn fairness metric)

---

### 4. User Preferences Table

Stores user-specific game settings.

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  dark_mode BOOLEAN DEFAULT 1,              -- Dark/light theme
  show_mass BOOLEAN DEFAULT 1,              -- Display mass on cells
  show_border BOOLEAN DEFAULT 1,            -- Show game boundaries
  show_grid BOOLEAN DEFAULT 1,              -- Display background grid
  continuity BOOLEAN DEFAULT 1,             -- Mouse-out behavior
  round_food BOOLEAN DEFAULT 1,             -- Food shape
  show_fps BOOLEAN DEFAULT 0,               -- FPS counter
  chat_enabled BOOLEAN DEFAULT 1,           -- Chat visibility
  sound_enabled BOOLEAN DEFAULT 1,          -- Sound effects
  volume INTEGER DEFAULT 50,                -- Volume level (0-100)
  skin_id INTEGER,                          -- Selected skin (future)
  language TEXT DEFAULT 'en',               -- Preferred language
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT volume_range CHECK(volume >= 0 AND volume <= 100)
);
```

**Design Notes:**
- Mirrors current `game-config.js` defaults
- Allows per-user customization
- Will override global defaults when user is authenticated
- Future-proof with skin_id and language support

---

### 5. Leaderboard Table

Persistent global leaderboard (replaces in-memory version).

```sql
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,                   -- Denormalized for query performance
  score INTEGER NOT NULL,                   -- Mass at end of game
  rank_position INTEGER NOT NULL,           -- 1-10 for top players
  achieved_at INTEGER NOT NULL,             -- When this score was achieved
  is_current BOOLEAN DEFAULT 1,             -- Current active leaderboard entry
  period_type TEXT DEFAULT 'all_time',      -- 'all_time', 'daily', 'weekly', 'monthly'
  period_start INTEGER,                     -- Period start timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_leaderboard_current ON leaderboard(is_current, period_type, score DESC);
CREATE INDEX idx_leaderboard_user ON leaderboard(user_id, achieved_at DESC);
CREATE INDEX idx_leaderboard_period ON leaderboard(period_type, period_start, score DESC);
```

**Design Notes:**
- Supports multiple leaderboard types (all-time, daily, weekly, monthly)
- `is_current` flag for active leaderboard (reset when period changes)
- Denormalized username for faster queries (updated on username change)
- Historical data preserved (all entries kept)
- Top 10 tracked per period

---

### 6. Achievements Table (Future)

Track unlocked achievements per user.

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_key TEXT UNIQUE NOT NULL,     -- 'first_kill', 'mass_1000', etc.
  name TEXT NOT NULL,                       -- Display name
  description TEXT NOT NULL,                -- Achievement description
  icon_url TEXT,                            -- Icon/badge image
  points INTEGER DEFAULT 0,                 -- Achievement point value
  is_hidden BOOLEAN DEFAULT 0,              -- Secret achievement
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL,             -- When achievement was unlocked
  progress INTEGER DEFAULT 0,               -- For progressive achievements
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, unlocked_at DESC);
```

**Design Notes:**
- Flexible achievement system
- Progressive achievements supported (e.g., "Eat 100/500/1000 cells")
- Hidden achievements for surprises
- Points system for gamification

---

## Implementation Plan

### Phase 1: Core User System (Week 1)

**Priority: HIGH**

1. **Update `src/server/sql.js`:**
   - Add `users` table creation
   - Add `game_stats` table creation
   - Add `user_preferences` table creation
   - Add indexes for performance

2. **Create `src/server/repositories/user-repository.js`:**
   - `createUser(privyId, userData)` - Create new user from Privy auth
   - `getUserByPrivyId(privyId)` - Find user by Privy ID
   - `getUserById(userId)` - Find user by internal ID
   - `updateUser(userId, updates)` - Update user profile
   - `getUserWithStats(userId)` - Get user + stats (JOIN)
   - `updateLastSeen(userId)` - Track user activity

3. **Create `src/server/repositories/stats-repository.js`:**
   - `getOrCreateStats(userId)` - Initialize stats for new user
   - `updateStats(userId, statsUpdate)` - Increment stats
   - `getTopPlayers(limit, statType)` - Leaderboard queries
   - `getUserRank(userId, statType)` - Get user's ranking

4. **Integrate with Socket.IO (`src/server/server.js`):**
   - Link socket connections to user IDs
   - Track authenticated vs guest players
   - Update last_seen on connection

### Phase 2: Real-Time Stats Tracking (Week 2)

**Priority: HIGH**

1. **Track gameplay events:**
   - On player spawn: Create or update game session
   - On cell eaten: Increment kills, update mass
   - On player death: End session, calculate stats
   - On split/eject: Track actions

2. **Create `src/server/repositories/session-repository.js`:**
   - `startSession(userId)` - Begin new game session
   - `endSession(sessionId, finalStats)` - Complete session
   - `updateSessionStats(sessionId, updates)` - Real-time updates
   - `getUserSessions(userId, limit)` - Match history

3. **Batch updates for performance:**
   - Buffer stat updates
   - Flush every 5-10 seconds
   - Immediate flush on game end

### Phase 3: Persistent Leaderboard (Week 2)

**Priority: HIGH**

1. **Replace in-memory leaderboard:**
   - Update `leaderboard` table on game end
   - Query top 10 players from database
   - Broadcast leaderboard updates to all clients

2. **Create `src/server/repositories/leaderboard-repository.js`:**
   - `updateLeaderboard(userId, score)` - Update rankings
   - `getTopPlayers(periodType, limit)` - Get top N
   - `getUserRank(userId, periodType)` - Get user's rank
   - `resetPeriodic(periodType)` - Reset daily/weekly/monthly

3. **Periodic reset job:**
   - Daily leaderboard resets at midnight
   - Weekly resets on Monday
   - Monthly resets on 1st

### Phase 4: User Preferences (Week 3)

**Priority: MEDIUM**

1. **Load preferences on connection:**
   - Override default settings from `game-config.js`
   - Send to client on socket connection
   - Apply settings in client

2. **Save preferences:**
   - Update database on settings change
   - Sync across devices/sessions

3. **Create `src/server/repositories/preferences-repository.js`:**
   - `getPreferences(userId)` - Load user settings
   - `updatePreferences(userId, settings)` - Save settings
   - `resetToDefaults(userId)` - Restore defaults

### Phase 5: Achievements System (Week 4+)

**Priority: LOW**

1. **Define achievements:**
   - Seed `achievements` table with initial achievements
   - Create achievement unlock logic

2. **Track progress:**
   - Check conditions on gameplay events
   - Unlock achievements
   - Notify player

3. **Create `src/server/repositories/achievement-repository.js`:**
   - `checkAchievements(userId, gameStats)` - Check unlock conditions
   - `unlockAchievement(userId, achievementKey)` - Grant achievement
   - `getUserAchievements(userId)` - Get unlocked achievements
   - `getAchievementProgress(userId)` - Progress on incomplete

---

## Repository Pattern

All database access follows the repository pattern:

```javascript
// Example: user-repository.js
const db = require('../sql.js');

const createUser = async (privyId, userData) => {
    const { username, email, authProvider } = userData;
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (privy_id, username, email, auth_provider, created_at, last_seen)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [privyId, username, email, authProvider, now, now],
            function(err) {
                if (err) return reject(err);
                resolve({ userId: this.lastID });
            }
        );
    });
};

const getUserByPrivyId = async (privyId) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE privy_id = ?',
            [privyId],
            (err, row) => {
                if (err) return reject(err);
                resolve(row);
            }
        );
    });
};

module.exports = {
    createUser,
    getUserByPrivyId,
    // ... more functions
};
```

---

## Data Flow

### User Authentication Flow

```
1. User logs in with Privy
   ↓
2. Client sends Privy auth token to server
   ↓
3. Server validates token with Privy
   ↓
4. Server checks if user exists (getUserByPrivyId)
   ↓
5. If new user: createUser()
   If existing: updateLastSeen()
   ↓
6. Load user preferences and stats
   ↓
7. Send complete user profile to client
   ↓
8. Link socket connection to user ID
```

### Game Session Flow

```
1. Player clicks "Play"
   ↓
2. Socket connects with user ID
   ↓
3. Server creates game session (startSession)
   ↓
4. Player plays game
   ↓
5. Real-time updates: kills, mass, etc.
   (buffered, flushed every 5 seconds)
   ↓
6. Player dies or quits
   ↓
7. End session (endSession)
   ↓
8. Update cumulative stats
   ↓
9. Update leaderboard if score is high enough
   ↓
10. Check for achievement unlocks
```

### Leaderboard Update Flow

```
1. Game session ends
   ↓
2. Get final mass/score
   ↓
3. Query current top 10 (getTopPlayers)
   ↓
4. If score > 10th place:
   - Insert new leaderboard entry
   - Mark old entries as not current
   - Broadcast update to all clients
```

---

## Performance Considerations

### Indexes

All tables have appropriate indexes for:
- Primary keys (automatic)
- Foreign keys (explicit)
- Frequently queried columns (user lookups, leaderboards)
- Sort columns (timestamps, scores)

### Query Optimization

1. **Denormalization:**
   - Username stored in leaderboard (avoid JOINs)
   - Updated when username changes

2. **Batch Updates:**
   - Buffer stat updates during gameplay
   - Flush periodically (5-10 seconds)
   - Immediate flush on critical events (death, achievement)

3. **Pagination:**
   - Leaderboard: Only top 10-100 loaded at once
   - Match history: Paginate with LIMIT/OFFSET
   - User lists: Lazy loading

### Caching Strategy (Future)

Consider adding Redis for:
- Session data (high write frequency)
- Leaderboard (high read frequency)
- User preferences (reduce DB hits)
- Achievement progress (real-time updates)

---

## Migration Path

### From Current State

1. **No data loss** - Existing tables preserved
2. **Backward compatible** - Game works without users table
3. **Graceful degradation** - Guests can still play
4. **Incremental rollout:**
   - Phase 1: Users + stats (guests still work)
   - Phase 2: Sessions (optional tracking)
   - Phase 3: Leaderboard (replaces in-memory)
   - Phase 4: Preferences (enhance experience)
   - Phase 5: Achievements (bonus features)

### Guest vs Authenticated

- **Guests:** Play without persistence (current behavior)
- **Authenticated:** Full features (stats, leaderboard, preferences)
- **Incentive:** Show stats preview, encourage sign-up

---

## Security Considerations

1. **Privy ID Validation:**
   - Always validate Privy tokens server-side
   - Never trust client-provided user IDs

2. **SQL Injection:**
   - All queries use parameterized statements
   - No string concatenation in SQL

3. **Rate Limiting:**
   - Limit stats updates per user
   - Prevent leaderboard manipulation
   - Throttle preference changes

4. **Data Privacy:**
   - Email optional, not publicly visible
   - Users can delete their account
   - CASCADE delete removes all user data

5. **Moderation:**
   - `is_banned` flag for problem users
   - Chat history for moderation review
   - Failed login tracking already implemented

---

## Testing Strategy

### Unit Tests

Test each repository function:
- User CRUD operations
- Stats calculations
- Leaderboard ranking logic
- Achievement unlock conditions

### Integration Tests

Test complete flows:
- User registration → game → stats update
- Leaderboard updates on game end
- Preference sync across sessions

### Load Testing

Test performance with:
- 100+ concurrent users
- Rapid stat updates
- Leaderboard queries under load

---

## Game Analytics & Key Metrics

### Core Learning Questions

Based on minimal analytics approach (3 events: `user_signup`, `game_start`, `game_end`):

#### 1. 🧠 **Is the game addictive?**
**Metric:** `avg_games_per_user_per_day`
```sql
-- Games per user per day
SELECT 
  DATE(started_at / 1000, 'unixepoch') as game_date,
  COUNT(*) / COUNT(DISTINCT user_id) as avg_games_per_user
FROM game_sessions
WHERE started_at >= strftime('%s', 'now', '-7 days') * 1000
GROUP BY game_date;
```

#### 2. 💭 **Do users come back?**
**Metrics:** `D1/D3/D7 retention` after wins vs losses
```sql
-- D1 Retention after wins
SELECT 
  COUNT(DISTINCT s1.user_id) as returned_users,
  COUNT(DISTINCT s1.user_id) * 100.0 / 
    (SELECT COUNT(DISTINCT user_id) FROM game_sessions WHERE is_win = 1) as retention_pct
FROM game_sessions s1
WHERE s1.is_win = 1
AND EXISTS (
  SELECT 1 FROM game_sessions s2 
  WHERE s2.user_id = s1.user_id 
  AND s2.started_at BETWEEN s1.ended_at AND s1.ended_at + (86400000) -- Next 24h
);

-- Compare: D1 Retention after losses
-- (Same query but with is_win = 0)
```

#### 3. ⚖️ **Is the game fair?**
**Metric:** `early_loss_rate` = % eaten before reaching 110%
```sql
-- Early loss rate (spawn fairness)
SELECT 
  COUNT(CASE WHEN is_early_loss = 1 THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN exit_reason = 'eaten' THEN 1 END) as early_loss_pct,
  AVG(CASE WHEN is_early_loss = 1 THEN duration END) as avg_time_before_early_death
FROM game_sessions
WHERE exit_reason = 'eaten';

-- Target: <30% early losses = fair spawning
-- If >50% early losses = spawn points need balancing
```

#### 4. 👑 **Are wins concentrated among few users?**
**Metric:** `win_concentration_rate`
```sql
-- Win concentration (top 10% dominance)
WITH user_wins AS (
  SELECT user_id, COUNT(*) as wins
  FROM game_sessions
  WHERE is_win = 1
  GROUP BY user_id
),
top_10_pct AS (
  SELECT SUM(wins) as top_wins
  FROM user_wins
  ORDER BY wins DESC
  LIMIT (SELECT COUNT(DISTINCT user_id) / 10 FROM user_wins)
)
SELECT 
  top_wins * 100.0 / (SELECT SUM(wins) FROM user_wins) as concentration_pct
FROM top_10_pct;

-- Target: <40% = fair distribution
-- If >60% = game favors experienced players too much
```

#### 5. 🌱 **Is the user base growing?**
**Metrics:** `DAU`, `MAU`, `growth_rate`
```sql
-- Daily Active Users & Growth
SELECT 
  DATE(started_at / 1000, 'unixepoch') as game_date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT CASE 
    WHEN u.created_at >= strftime('%s', 'now', '-1 day') * 1000 
    THEN user_id 
  END) as new_users
FROM game_sessions gs
JOIN users u ON gs.user_id = u.id
WHERE started_at >= strftime('%s', 'now', '-30 days') * 1000
GROUP BY game_date;
```

### Performance Percentage Calculations

**Win/Loss Definition:**
- **Win:** `performance_pct > 10` (gained 10%+ mass)
- **Fair Game:** `performance_pct between -10 and 110`
- **Early Loss:** Eaten with `performance_pct < 10`

**Example Calculations:**
```sql
-- Calculate performance percentage on game end
UPDATE game_sessions 
SET 
  performance_pct = ((final_mass - starting_mass) * 100.0 / starting_mass),
  is_win = (final_mass > starting_mass * 1.1),
  is_early_loss = (exit_reason = 'eaten' AND final_mass < starting_mass * 1.1),
  reached_110_pct = (highest_mass >= starting_mass * 1.1)
WHERE id = ?;
```

### Cash-Out Mechanics (Escape Key)

**Exit Reason Flow:**
```
Player presses Escape → exit_reason = 'cashed_out'
Player eaten → exit_reason = 'eaten'
Player disconnects → exit_reason = 'disconnected'
```

**Analytics Impact:**
```sql
-- Cashout behavior analysis
SELECT 
  AVG(CASE WHEN exit_reason = 'cashed_out' THEN performance_pct END) as avg_cashout_pct,
  AVG(CASE WHEN exit_reason = 'eaten' THEN performance_pct END) as avg_eaten_pct,
  COUNT(CASE WHEN exit_reason = 'cashed_out' AND is_win = 1 THEN 1 END) as profitable_cashouts,
  COUNT(CASE WHEN exit_reason = 'cashed_out' AND is_win = 0 THEN 1 END) as loss_cutting_cashouts
FROM game_sessions;

-- Insight: Do players cash out when winning or cut losses?
```

### Money-Based Gameplay (Future)

**Entry/Exit Flow:**
```
1. Player deposits $10 → entry_amount = 10.00, starting_mass = 10
2. Player grows to mass 25 → performance_pct = 150%
3. Player cashes out → exit_amount = 25.00, net_profit = +15.00
```

**Profit/Loss Tracking:**
```sql
-- Update money stats on cashout
UPDATE game_stats
SET 
  total_deposited = total_deposited + ?,
  total_withdrawn = total_withdrawn + ?,
  net_profit = total_withdrawn - total_deposited,
  biggest_win = MAX(biggest_win, exit_amount - entry_amount),
  biggest_loss = MIN(biggest_loss, exit_amount - entry_amount)
WHERE user_id = ?;
```

**House Edge Considerations:**
- Track `total_deposited` vs `total_withdrawn` system-wide
- Monitor `net_profit` distribution across users
- Detect outliers (potential cheating or exploits)

---

## Monitoring & Analytics

### Database Metrics

Monitor:
- Query execution time
- Connection pool usage
- Table sizes
- Index efficiency

### Application Metrics

Track:
- User registration rate
- Active users (daily/weekly/monthly)
- Average session duration
- Win/loss distribution
- Early loss rate (fairness)
- Win concentration (fairness)
- Cashout vs eaten ratio
- Return rate after wins vs losses

### Alerts

Set up alerts for:
- Slow queries (>100ms)
- Failed database connections
- Unusual stat patterns (potential cheating)
- High early loss rate (>50% = unfair spawning)
- High win concentration (>60% = imbalanced game)
- Negative net profit outliers (money-based gameplay)

---

## Future Enhancements

### Advanced Features

1. **Social Features:**
   - Friends system
   - Private rooms
   - Team mode
   - Clans/guilds

2. **Web3 Integration:**
   - NFT achievements
   - Tokenized rewards
   - Wallet-based skins
   - Blockchain leaderboard

3. **Analytics:**
   - Heatmaps of player deaths
   - Popular regions of map
   - Time-of-day activity
   - User retention metrics

4. **Competitive:**
   - Ranked matchmaking
   - ELO rating system
   - Tournaments
   - Seasonal rewards

---

## Resources

### Documentation References

- **SQLite3 Docs:** https://www.sqlite.org/docs.html
- **Node SQLite3:** https://github.com/TryGhost/node-sqlite3
- **SQL Best Practices:** https://www.sqlstyle.guide/
- **Database Design:** https://www.vertabelo.com/blog/database-design-best-practices/

### Related Files

- `src/server/sql.js` - Database connection
- `src/server/repositories/` - Data access layer
- `config.js` - Database configuration
- `docs/ARCHITECTURE.md` - System architecture
- `docs/DEVELOPMENT.md` - Development roadmap

---

_Last Updated: November 2024_
_Status: Design Complete - Ready for Implementation_

