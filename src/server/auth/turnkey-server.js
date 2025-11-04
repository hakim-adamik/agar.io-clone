"use strict";

// Turnkey Server SDK Integration
// Handles server-side authentication and wallet management

const {
  Turnkey
} = require('@turnkey/sdk-server');
const crypto = require('crypto');
class TurnkeyServerAuth {
  constructor() {
    this.sdk = null;
    this.sessions = new Map(); // In-memory session storage (use Redis in production)
    this.initialize();
  }
  initialize() {
    // Check for required environment variables
    const requiredVars = ['TURNKEY_ORGANIZATION_ID', 'TURNKEY_API_PUBLIC_KEY', 'TURNKEY_API_PRIVATE_KEY'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.warn(`Turnkey SDK disabled. Missing: ${missing.join(', ')}`);
      console.warn('Running in DEMO MODE - Authentication will work but without real Turnkey integration');
      console.warn('To enable full Turnkey: add API keys from https://app.turnkey.com to .env');

      // Set demo mode flag
      this.demoMode = true;
      return;
    }
    try {
      this.sdk = new Turnkey({
        apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
        apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
        organizationId: process.env.TURNKEY_ORGANIZATION_ID,
        baseUrl: process.env.TURNKEY_API_URL || 'https://api.turnkey.com'
      });
    } catch (error) {
      console.error('Failed to initialize Turnkey SDK:', error);
    }
  }

  // Generate a secure session token
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create or get user sub-organization
  async getOrCreateUserSubOrg(email, userId) {
    if (!this.sdk) {
      throw new Error('Turnkey SDK not initialized');
    }
    try {
      // Check if sub-org already exists for this user
      const subOrgName = `user_${userId}`;

      // Try to get existing sub-organization
      try {
        const existingSubOrg = await this.sdk.getSubOrganization({
          organizationId: process.env.TURNKEY_ORGANIZATION_ID,
          organizationName: subOrgName
        });
        if (existingSubOrg) {
          return existingSubOrg;
        }
      } catch (error) {
        // Sub-org doesn't exist, create it
      }

      // Create new sub-organization
      const subOrg = await this.sdk.createSubOrganization({
        organizationName: subOrgName,
        users: [{
          email: email,
          apiKeys: [],
          authenticators: []
        }]
      });

      // Automatically create a wallet for the user (hidden from UI)
      await this.createUserWallet(subOrg.organizationId);
      return subOrg;
    } catch (error) {
      console.error('Error creating user sub-organization:', error);
      throw error;
    }
  }

  // Create a wallet for the user (hidden from UI)
  async createUserWallet(subOrgId) {
    if (!this.sdk) {
      throw new Error('Turnkey SDK not initialized');
    }
    try {
      const wallet = await this.sdk.createWallet({
        organizationId: subOrgId,
        walletName: 'default',
        accounts: [{
          curve: 'secp256k1',
          pathFormat: 'BIP32',
          path: "m/44'/60'/0'/0/0",
          addressFormat: 'ETHEREUM'
        }]
      });
      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      // Non-critical error - wallet creation can be retried later
    }
  }

  // Authenticate user via email
  async authenticateEmail(email, turnkeyUserId) {
    const userId = turnkeyUserId || crypto.randomBytes(16).toString('hex');
    const sessionToken = this.generateSessionToken();

    // Get or create user sub-organization
    let subOrg = null;
    let walletAddress = null;
    if (this.sdk) {
      try {
        subOrg = await this.getOrCreateUserSubOrg(email, userId);
        // Get wallet address if available
        const wallets = await this.sdk.getWallets({
          organizationId: subOrg.organizationId
        });
        if (wallets && wallets.length > 0) {
          walletAddress = wallets[0].addresses?.[0];
        }
      } catch (error) {
        console.error('Sub-org creation error:', error);
        // Continue without sub-org - auth still works
      }
    } else if (this.demoMode) {
      // Demo mode - create mock wallet address
      walletAddress = '0xDEMO' + crypto.randomBytes(18).toString('hex');
    }

    // Create session
    const session = {
      token: sessionToken,
      user: {
        id: userId,
        email: email,
        displayName: email.split('@')[0],
        organizationId: subOrg?.organizationId
      },
      walletAddress: walletAddress,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    this.sessions.set(sessionToken, session);
    return {
      token: sessionToken,
      user: session.user,
      walletAddress: walletAddress
    };
  }

  // Authenticate user via passkey
  async authenticatePasskey(credentialId, turnkeyUserId) {
    // For passkey auth, we need to verify the credential
    // This is a simplified version - implement full WebAuthn verification in production

    const userId = turnkeyUserId || credentialId;
    const sessionToken = this.generateSessionToken();
    const session = {
      token: sessionToken,
      user: {
        id: userId,
        displayName: `User_${userId.substring(0, 8)}`,
        authenticationType: 'passkey'
      },
      walletAddress: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    this.sessions.set(sessionToken, session);
    return {
      token: sessionToken,
      user: session.user,
      walletAddress: null
    };
  }

  // Authenticate via Google OAuth
  async authenticateGoogle(credential) {
    // Decode the JWT token from Google
    // In production, verify the token signature properly
    let payload;
    try {
      // Check if credential is a valid JWT (has 3 parts separated by dots)
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode the payload (middle part)
      const payloadString = Buffer.from(parts[1], 'base64').toString();
      payload = JSON.parse(payloadString);
    } catch (error) {
      console.error('Failed to decode Google credential:', error);
      throw new Error('Invalid Google credential');
    }

    const userId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;
    const sessionToken = this.generateSessionToken();

    // Create sub-org for Google user (skip for now until Turnkey SDK is fully implemented)
    let walletAddress = null;
    // TODO: Uncomment when Turnkey SDK is properly installed
    // if (this.sdk && email) {
    //   try {
    //     const subOrg = await this.getOrCreateUserSubOrg(email, userId);
    //     const wallets = await this.sdk.getWallets({
    //       organizationId: subOrg.organizationId
    //     });
    //     if (wallets && wallets.length > 0) {
    //       walletAddress = wallets[0].addresses?.[0];
    //     }
    //   } catch (error) {
    //     console.error('Google auth sub-org error:', error);
    //   }
    // }
    const session = {
      token: sessionToken,
      user: {
        id: userId,
        email: email,
        displayName: name || email.split('@')[0],
        picture: picture,
        authenticationType: 'google',
        provider: 'Google'  // Add provider field for UI display
      },
      walletAddress: walletAddress,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    this.sessions.set(sessionToken, session);
    return {
      token: sessionToken,
      user: session.user,
      walletAddress: walletAddress
    };
  }

  // Validate session token
  validateSession(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  // Logout
  logout(token) {
    this.sessions.delete(token);
    return {
      success: true
    };
  }

  // Get client configuration
  getClientConfig() {
    return {
      turnkey: {
        organizationId: process.env.TURNKEY_ORGANIZATION_ID || null,
        googleClientId: process.env.GOOGLE_CLIENT_ID || null,
        discordClientId: process.env.DISCORD_CLIENT_ID || null,
        appleClientId: process.env.APPLE_CLIENT_ID || null
      }
    };
  }
}

// Export singleton instance
module.exports = new TurnkeyServerAuth();