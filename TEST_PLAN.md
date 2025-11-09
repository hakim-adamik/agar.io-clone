# Database Integration Test Plan

## Overview
This document provides a step-by-step manual testing guide for the database integration features implemented in Phase A.

---

## Prerequisites
1. Server running on http://localhost:8080
2. Browser with developer console open
3. Privy authentication configured

---

## Test Scenarios

### 1. Guest User Flow (Baseline Test)
**Purpose:** Verify the game still works for non-authenticated users

**Steps:**
1. Open http://localhost:8080 in an incognito window
2. Click "Play as Guest"
3. Play the game normally
4. Toggle settings using chat commands:
   - Type `-dark` to toggle dark mode
   - Type `-mass` to toggle mass display
   - Type `-border` to toggle border
5. Refresh the page

**Expected Results:**
- ✅ Game plays normally
- ✅ Settings change immediately
- ✅ Settings reset to defaults after refresh (no persistence)
- ✅ No errors in console

---

### 2. Privy Authentication Flow
**Purpose:** Test user creation and authentication through Privy

**Steps:**
1. Open http://localhost:8080
2. Click "Sign In" button
3. Choose authentication method (Google recommended)
4. Complete authentication
5. Check browser console for: `User authenticated successfully`
6. Check localStorage in DevTools (Application tab)

**Expected Results:**
- ✅ Privy modal opens correctly
- ✅ Authentication completes
- ✅ `localStorage.userData` contains:
  ```json
  {
    "dbUserId": [number],
    "username": "[your_username]",
    "email": "[your_email]",
    "avatarUrl": "[url]"
  }
  ```
- ✅ Database creates user record (check server logs)

**Verification in Console:**
```javascript
// Run in browser console to verify
JSON.parse(localStorage.getItem('userData'))
```

---

### 3. User Preferences Persistence
**Purpose:** Test that settings are saved and loaded from database

**Steps:**
1. Sign in with Privy
2. Click on your profile icon to open the Profile modal
3. In the "Game Preferences" section, toggle various settings:
   - Toggle Dark Mode checkbox
   - Toggle Show Mass checkbox
   - Toggle Show Border checkbox
   - Toggle Show FPS checkbox
   - Toggle Show Grid checkbox
   - Toggle Continuity checkbox
   - Toggle Round Food checkbox
4. Close the modal and refresh the page
5. Open the Profile modal again
6. Start a game and verify settings are applied

**Expected Results:**
- ✅ Settings save immediately (check Network tab for PUT requests to `/api/user/[id]/preferences`)
- ✅ Settings persist after refresh
- ✅ Settings load automatically when game starts
- ✅ Console shows: `Loading user preferences...` (if implemented)

**Verification in Console:**
```javascript
// Check current settings
console.log({
  darkMode: global.backgroundColor === "#181818",
  showMass: global.toggleMassState === 1,
  showBorder: global.borderDraw,
  showFps: global.showFpsCounter
});
```

---

### 4. Game Session Tracking
**Purpose:** Verify that game sessions are created and tracked

**Steps:**
1. Sign in with Privy
2. Start a game
3. Play for at least 30 seconds
4. Eat some food and other players
5. Get eaten or refresh the page
6. Check server logs

**Expected Results:**
- ✅ Server logs show: `Created game session [id] for user [id]`
- ✅ Server logs show: `Ended session [id] with stats`
- ✅ Socket connection includes userId in query params
- ✅ Database session record created

**Network Tab Verification:**
- WebSocket connection URL should include: `?type=player&userId=[id]&playerName=[name]`

---

### 5. Profile Modal Stats
**Purpose:** Test that real user statistics are displayed

**Steps:**
1. Sign in with Privy
2. Play several games (at least 3)
3. Click on your profile icon/name
4. View the statistics in the profile modal

**Expected Results:**
- ✅ Profile shows real username (not "Guest")
- ✅ Stats update after each game:
  - Games Played increments
  - Total Time Played increases
  - High Score updates if beaten
- ✅ Network tab shows GET request to `/api/user/[id]`

---

### 6. Cross-Session Persistence
**Purpose:** Verify data persists across browser sessions

**Steps:**
1. Sign in and play a game
2. Change some settings
3. Close the browser completely
4. Open browser and go to http://localhost:8080
5. Sign in with the same account
6. Start a game

**Expected Results:**
- ✅ Settings are restored
- ✅ Stats show previous games
- ✅ Username is remembered

---

## API Testing Commands

Run these in the browser console while signed in:

```javascript
// Get current user data
const userData = JSON.parse(localStorage.getItem('userData'));
console.log('User ID:', userData?.dbUserId);

// Test preferences API
fetch(`/api/user/${userData.dbUserId}/preferences`)
  .then(r => r.json())
  .then(console.log);

// Test user stats API
fetch(`/api/user/${userData.dbUserId}`)
  .then(r => r.json())
  .then(data => {
    console.log('User Profile:', data.user);
    console.log('Game Stats:', data.stats);
    console.log('Recent Sessions:', data.recentSessions);
  });

// Test updating preferences
fetch(`/api/user/${userData.dbUserId}/preferences`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dark_mode: 0 })
})
  .then(r => r.json())
  .then(console.log);
```

---

## Database Verification

Check the SQLite database directly:

```bash
# In terminal, navigate to project root
sqlite3 src/server/db/db.sqlite3

# Run these SQL commands:
.tables
SELECT * FROM users;
SELECT * FROM user_preferences;
SELECT * FROM game_sessions ORDER BY id DESC LIMIT 5;
SELECT * FROM game_stats;
.quit
```

---

## Common Issues & Troubleshooting

### Issue: "Cannot read userData" errors
**Solution:** Clear localStorage and re-authenticate
```javascript
localStorage.clear();
location.reload();
```

### Issue: Settings not saving
**Check:**
1. Network tab for failed PUT requests
2. Server logs for database errors
3. Ensure you're authenticated (not a guest)

### Issue: Stats not updating
**Check:**
1. Server logs for session creation/end
2. Database for session records
3. Socket connection includes userId

### Issue: Privy authentication fails
**Check:**
1. PRIVY_APP_ID is set correctly
2. Webpack bundles were rebuilt
3. Browser console for Privy errors

---

## Success Criteria Checklist

- [ ] Guest users can play without authentication
- [ ] Privy authentication creates database user
- [ ] Settings persist for authenticated users
- [ ] Settings load on game start
- [ ] Settings save immediately when changed
- [ ] Game sessions are tracked in database
- [ ] Profile modal shows real statistics
- [ ] Stats update after each game
- [ ] Data persists across browser sessions
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Test Report Template

**Date:** ___________
**Tester:** ___________
**Build:** ___________

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Guest User Flow | | |
| Privy Authentication | | |
| Preferences Save | | |
| Preferences Load | | |
| Session Tracking | | |
| Profile Stats | | |
| Cross-Session | | |

**Issues Found:**
1.
2.
3.

**Overall Status:** ⬜ Pass / ⬜ Fail

---

## Next Steps After Testing

If all tests pass:
1. Commit changes to `user-data-clean` branch
2. Create pull request to master
3. Deploy to staging environment
4. Run tests again in production

If tests fail:
1. Check server logs for errors
2. Check browser console for errors
3. Verify database tables exist
4. Ensure webpack bundles are up-to-date
5. Review the implementation code

---

_Last Updated: November 2024_