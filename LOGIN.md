# Turnkey Authentication Integration

## Overview
This Agar.io clone implements authentication using Turnkey SDK for secure, decentralized user authentication with support for email, passkeys, and OAuth providers (Google, Discord, Apple).

## Architecture

```
USER BROWSER (Client)              OUR SERVER                TURNKEY CLOUD
     |                                 |                           |
     |--[Clicks "Sign In"]------------>|                           |
     |                                 |                           |
     |--[Enters Email/OAuth]--------->|                           |
     |                                 |--[Verify with Turnkey]--->|
     |                                 |<--[User Validated]--------|
     |<--[Session Token]---------------|                           |
     |                                 |                           |
     |--[Play Game with Token]------->|                           |
```

## Setup Instructions

### 1. Create Turnkey Organization
1. Go to https://app.turnkey.com
2. Create a new organization
3. Get your API credentials

### 2. Configure Environment
Create a `.env` file (copy from `.env.example`):
```bash
TURNKEY_ORGANIZATION_ID=your_org_id
TURNKEY_API_PUBLIC_KEY=your_public_key
TURNKEY_API_PRIVATE_KEY=your_private_key
GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application
```bash
npm start
```

## Authentication Flow

### Email Authentication
1. User enters email address
2. Turnkey sends verification email
3. User clicks link in email
4. Session created and user logged in

### Passkey Authentication
1. User creates/uses device biometric
2. WebAuthn handles device authentication
3. Turnkey validates the passkey
4. Session created and user logged in

### Google OAuth
1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User selects account
4. Token verified server-side
5. Session created and user logged in

## Features
- **Secure Sessions**: JWT-based session management
- **Hidden Wallets**: Each user gets an Ethereum wallet (for future Web3 features)
- **Multiple Auth Methods**: Email, Passkey, Google OAuth
- **Guest Mode**: Players can play without authentication
- **Persistent Login**: Sessions stored in localStorage

## Security Considerations
- API keys should never be exposed client-side
- Use HTTPS in production
- Implement rate limiting for authentication endpoints
- Use Redis or database for session storage in production

## Future Enhancements
- Discord OAuth integration
- Apple Sign In
- Two-factor authentication
- Account recovery options
- User profile management