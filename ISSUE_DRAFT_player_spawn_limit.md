## Issue: Player spawn limit issue with 'farthest' spawn mode - cannot spawn more than ~10 players

### Issue Description
When attempting to spawn multiple bot players (or connect many clients), the server appears to have a soft limit of approximately 10 concurrent players when using the `farthest` spawn position mode.

### Root Cause Analysis
After investigating the codebase, the issue is **not** due to a hardcoded player limit. Instead, it's caused by the spawn position algorithm:

1. **The `newPlayerInitialPosition: "farthest"` setting** in `config.js` uses a uniform distribution algorithm that attempts to place new players as far as possible from existing players
2. **Algorithm limitation**: With many players, the algorithm struggles to find suitable spawn positions, effectively creating a soft cap on concurrent players
3. **No explicit limit**: The code doesn't enforce any maximum player count - connections are accepted until the spawn algorithm fails or system resources are exhausted

### Steps to Reproduce
1. Start the agar.io server with default configuration
2. Attempt to connect more than 10 clients (either bots or browser clients)
3. Observe that additional players beyond ~10 fail to spawn properly

### Tested With
- Bot script attempting to spawn 20+ automated players
- Multiple browser clients connecting simultaneously

### Proposed Solution
Change the spawn mode in `config.js` from:
```javascript
newPlayerInitialPosition: "farthest",
```
To:
```javascript
newPlayerInitialPosition: "random",
```

This switches from the uniform distribution "farthest" algorithm to random spawning, which should allow many more concurrent players.

### Alternative Solutions
1. Improve the `uniformPosition` algorithm in `src/server/lib/util.js` to handle high player density better
2. Add a fallback mechanism that switches to random spawning when the farthest algorithm fails
3. Make the spawn algorithm configurable with a timeout/retry limit

### Impact
- This limitation affects stress testing with bot players
- Prevents hosting games with many concurrent players
- May cause connection issues in production environments with high player counts

### Environment
- Node.js version: 14+
- Repository: Latest version from master branch
- Configuration: Default `config.js` settings