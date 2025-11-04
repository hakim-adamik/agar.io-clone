"use strict";

// Authentication Routes
// Handles all auth-related API endpoints

const express = require('express');
const router = express.Router();
const turnkeyAuth = require('./turnkey-server');

// Get client configuration
router.get('/config', (req, res) => {
  res.json(turnkeyAuth.getClientConfig());
});

// Email authentication
router.post('/auth/email', async (req, res) => {
  try {
    const {
      email,
      turnkeyUserId
    } = req.body;
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }
    const authData = await turnkeyAuth.authenticateEmail(email, turnkeyUserId);
    res.json(authData);
  } catch (error) {
    console.error('Email auth error:', error);
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

// Passkey authentication
router.post('/auth/passkey', async (req, res) => {
  try {
    const {
      credentialId,
      turnkeyUserId
    } = req.body;
    if (!credentialId) {
      return res.status(400).json({
        error: 'Credential ID is required'
      });
    }
    const authData = await turnkeyAuth.authenticatePasskey(credentialId, turnkeyUserId);
    res.json(authData);
  } catch (error) {
    console.error('Passkey auth error:', error);
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

// Google OAuth authentication
router.post('/auth/google', async (req, res) => {
  try {
    const {
      credential
    } = req.body;
    if (!credential) {
      return res.status(400).json({
        error: 'Google credential is required'
      });
    }
    const authData = await turnkeyAuth.authenticateGoogle(credential);
    res.json(authData);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

// Validate session
router.post('/auth/validate', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      error: 'No token provided'
    });
  }
  const session = turnkeyAuth.validateSession(token);
  if (!session) {
    return res.status(401).json({
      error: 'Invalid or expired session'
    });
  }
  res.json({
    user: session.user,
    walletAddress: session.walletAddress,
    token: token  // Return the same token so client can continue using it
  });
});

// Logout
router.post('/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    turnkeyAuth.logout(token);
  }
  res.json({
    success: true
  });
});

// Turnkey signing endpoint (required for SDK)
router.post('/turnkey/sign', async (req, res) => {
  try {
    // This endpoint is used by Turnkey SDK for request signing
    // The actual implementation depends on your Turnkey setup
    const {
      payload
    } = req.body;

    // In a real implementation, you would:
    // 1. Validate the request
    // 2. Sign it with your API key
    // 3. Return the signed request

    res.json({
      signed: true,
      payload: payload
    });
  } catch (error) {
    console.error('Signing error:', error);
    res.status(500).json({
      error: 'Signing failed'
    });
  }
});
module.exports = router;