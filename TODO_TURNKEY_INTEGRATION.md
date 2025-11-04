# TODO: Complete Turnkey SDK Integration with OAuth Providers

## Current Status
✅ **Completed**:
- Basic authentication UI with Google, Discord, Apple, X buttons
- Google OAuth flow (basic implementation)
- Session management on server
- Authentication modal with proper styling
- Environment variable configuration (.env)

❌ **Not Implemented**:
- Real Turnkey SDK integration
- Wallet creation for users
- Sub-organization management
- Persistent user data storage

## Implementation Roadmap

### Phase 1: Install & Configure Turnkey SDK ⚡ Priority: HIGH
```bash
npm install @turnkey/sdk-server @turnkey/sdk-browser
```

**Tasks**:
- [ ] Install official Turnkey SDK packages
- [ ] Remove mock/demo mode from `turnkey-server.js`
- [ ] Initialize Turnkey client with real API credentials
- [ ] Test connection to Turnkey API

### Phase 2: Google OAuth + Turnkey Integration 🔐 Priority: HIGH
**Location**: `src/server/auth/turnkey-server.js`

**Tasks**:
- [ ] Implement `getOrCreateUserSubOrg()` properly:
  ```javascript
  async getOrCreateUserSubOrg(email, userId) {
    // 1. Check if sub-org exists for this Google user
    // 2. If not, create new sub-organization
    // 3. Generate Ethereum wallet
    // 4. Return wallet address and sub-org ID
  }
  ```
- [ ] Update `authenticateGoogle()` to:
  - Verify Google token properly
  - Create Turnkey sub-org for new users
  - Generate and store wallet address
  - Link Google ID → Turnkey sub-org ID

### Phase 3: Database Integration 💾 Priority: HIGH
**Requirements**: Store user ↔ wallet mappings

**Schema**:
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  google_id VARCHAR UNIQUE,
  turnkey_sub_org_id VARCHAR UNIQUE,
  wallet_address VARCHAR,
  created_at TIMESTAMP,
  last_login TIMESTAMP
);
```

**Tasks**:
- [ ] Set up SQLite/PostgreSQL for user data
- [ ] Create user model
- [ ] Store Google ID → Turnkey sub-org mapping
- [ ] Implement user lookup functions

### Phase 4: Complete OAuth Provider Support 🌐 Priority: MEDIUM
**Providers**: Discord, Apple, X (Twitter)

**Tasks per provider**:
- [ ] Register OAuth app with provider
- [ ] Add OAuth client ID to `.env`
- [ ] Implement OAuth flow handler
- [ ] Create Turnkey sub-org after successful OAuth
- [ ] Test end-to-end flow

### Phase 5: Wallet Features 💰 Priority: LOW
**Future Web3 Features**:
- [ ] Display wallet address in profile
- [ ] Show ETH/token balances
- [ ] Enable NFT rewards for achievements
- [ ] Implement on-chain leaderboard
- [ ] Add crypto tipping between players

## Environment Variables Needed

Add to `.env`:
```bash
# Turnkey API (Already have)
TURNKEY_ORGANIZATION_ID=xxx
TURNKEY_API_PUBLIC_KEY=xxx
TURNKEY_API_PRIVATE_KEY=xxx

# OAuth Providers (Need to add)
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
APPLE_CLIENT_ID=xxx
APPLE_CLIENT_SECRET=xxx
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx

# Database
DATABASE_URL=sqlite://./database.db
```

## Code Locations

| Feature | File | Status |
|---------|------|--------|
| Server Auth Routes | `src/server/auth/routes.js` | ✅ Structure ready |
| Turnkey Server | `src/server/auth/turnkey-server.js` | ⚠️ Needs real implementation |
| Client Auth Modal | `src/client/auth/auth-modal.js` | ✅ UI complete |
| Turnkey Client | `src/client/auth/turnkey-client.js` | ⚠️ Needs SDK integration |
| Database Models | `src/server/models/user.js` | ❌ Not created |

## Testing Checklist

- [ ] User can sign in with Google
- [ ] Wallet is created on first sign-in
- [ ] Wallet address persists across sessions
- [ ] User can sign out and sign back in
- [ ] Same Google account → Same wallet
- [ ] Multiple OAuth providers can link to same wallet
- [ ] Error handling for Turnkey API failures

## Resources

- [Turnkey SDK Docs](https://docs.turnkey.com/sdks/introduction)
- [Turnkey Embedded Wallets](https://docs.turnkey.com/embedded-wallets/introduction)
- [OAuth + Turnkey Pattern](https://docs.turnkey.com/guides/oauth-wallets)
- [Google Identity Services](https://developers.google.com/identity)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

## Success Metrics

- ✅ Users can sign in with Google and get a real wallet
- ✅ Wallet addresses are persistent
- ✅ No private keys are exposed to client or server
- ✅ Users don't need to know about crypto
- ✅ Future-ready for Web3 features

## Notes

- Start with Google OAuth (most common)
- Keep the UX simple - users shouldn't know they have a wallet unless they want to
- Consider adding "Export Wallet" feature later for power users
- Turnkey handles all key management - we never touch private keys

---

**Priority**: Complete Phase 1-3 first to have a working Google + Turnkey integration
**Timeline**: ~2-3 days for full implementation
**Complexity**: Medium (most code structure is ready)