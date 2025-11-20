# Claude.md - Agar.io Clone Development Guide

## Project Overview

A fully functional Agar.io clone built with Node.js, Socket.io, and HTML5 Canvas. Originally created by @huytd, now maintained by @owenashurst.

---

## ✅ Core Features

### Gameplay
- **Multi-Arena System**: 10 players per arena, 50 arenas max (500+ concurrent players)
- **Waiting Room**: Games require minimum 2 players; players wait in lobby until enough join
- **Core Mechanics**: Movement, eating, splitting (15s merge timer), mass ejection, viruses
- **Spectator Mode**: Watch games without participating
- **Leaderboard**: Real-time rankings per arena
- **Mobile Support**: Full touch controls and responsive design
- **No Inactivity Kicks**: Players stay in-game until eaten or they exit (ESC key)

### User System
- **Authentication**: Privy SDK (Google, Discord, Twitter, Email)
- **Guest Play**: Auto-generated names for instant play
- **User Profiles**: Persistent stats and preferences (PostgreSQL)
- **Virtual Wallet**: $1 default balance for authenticated users
- **Preferences**: Dark mode, mass display, borders, etc.

### Technical
- **Performance**: Viewport culling, grid caching, 60Hz updates
- **Architecture**: Socket.io rooms, per-arena game loops
- **Database**: PostgreSQL (Neon) with migration system
- **REST API**: Full user/stats/preferences endpoints

---

## 🎮 Game Behavior

### Waiting Room System
- **Minimum Players**: 2 required to start a game
- **Countdown**: 3-second countdown when minimum reached
- **Visual Feedback**: Player count display, animated countdown
- **Leave Option**: Players can exit to landing page

### Player Persistence
- **No Inactivity Timeout**: Players remain in-game even when idle
- **Natural Resolution**: Inactive players become food for others
- **Reconnection**: Currently, disconnected players are removed (future: allow reconnect)
- **Exit Options**: ESC key or being eaten

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run watch

# Production
npm start

# Run tests
npm test
```

### Configuration
```javascript
// config.js key settings
minPlayersToStart: 2,    // Waiting room minimum
maxPlayersPerArena: 10,   // Arena capacity
maxTotalArenas: 50,       // Total arena limit
// No maxHeartbeatInterval - inactivity kicking removed
```

---

## 📂 Project Structure

### Key Files
- **Game Logic**: `src/server/game-logic.js`, `src/server/arena.js`
- **Player Mechanics**: `src/server/map/player.js`
- **Client**: `src/client/js/app.js`, `src/client/js/render.js`
- **Configuration**: `config.js`, `src/client/js/game-config.js`
- **Database**: `src/server/services/`, `migrations/`

### Architecture
- **ArenaManager**: Orchestrates multiple game instances
- **Arena**: Individual game room with own state
- **Socket.io Rooms**: Arena-scoped broadcasting
- **Repository Pattern**: Clean database access layer

---

## 🛠 Development Tasks

### Adding Features
1. **New Game Mechanics**: Edit `src/server/game-logic.js`
2. **UI Changes**: Modify `src/client/index.html` and `src/client/css/`
3. **Socket Events**: Add handlers in `arena.js` and `app.js`
4. **Database**: Create migrations in `migrations/`

### Common Tasks
```javascript
// Add chat command (src/client/js/chat-client.js)
if (message.startsWith("-yourcommand")) {
    // Handle command
}

// Modify physics (src/server/map/player.js)
const MIN_SPEED = 6.25;  // Base speed
const SPLIT_CELL_SPEED = 20;  // Split velocity
```

---

## 🔧 Current Status

### Working Features
- ✅ Multi-arena gameplay
- ✅ Waiting room with countdown
- ✅ Authentication & profiles
- ✅ No inactivity kicks
- ✅ Mobile support
- ✅ Virtual wallet system

### Known Issues
- Session tracking temporarily disabled (causes disconnects)
- Disconnected players removed immediately (no reconnection)

### Next Priorities
1. Fix session tracking disconnect issue
2. Real-time stats during gameplay
3. Leaderboard persistence
4. Wallet earnings from gameplay

---

## 🚀 Deployment

### Google Cloud Run
```bash
./deploy.sh  # Automated deployment script
```

### Docker
```bash
docker build -t agarioclone .
docker run -p 8080:8080 -e PORT=8080 agarioclone
```

### Environment Variables
- `PORT`: Server port (default: 8080)
- `DATABASE_URL`: PostgreSQL connection string
- `PRIVY_APP_ID`: Authentication app ID
- `NODE_ENV`: production/development

---

## 🤖 Bot Testing

Separate bot repository available for testing:
```bash
cd /path/to/bots
npm start              # 3 default bots
node bot-players.js --bots 20  # Custom count
```

---

## 📝 Contributing

1. Fork and create feature branch
2. Run tests: `npm test`
3. Ensure no linting errors
4. Test with multiple clients
5. Submit PR with clear description

### Code Style
- ESLint configuration in `.eslintrc`
- 4 spaces indentation
- camelCase variables, PascalCase classes

---

## 📊 Recent Updates (November 2024)

- **Waiting Room**: Players wait for minimum 2 to start
- **No Inactivity Kicks**: Players stay until eaten/exit
- **PostgreSQL Migration**: From SQLite to Neon cloud
- **Mobile UX**: Hamburger menu, better touch controls
- **Performance**: 60Hz updates, viewport culling

---

## 📞 Resources

- **GitHub Issues**: Report bugs and request features
- **Performance**: See `PERFORMANCE_OPTIMIZATIONS.md`
- **Architecture**: See `TECHNICAL_ARCHITECTURE.md`

---

_Last Updated: November 2024 - Waiting room feature and inactivity removal complete_