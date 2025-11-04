import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { TurnkeyProvider, useTurnkey, Auth } from '@turnkey/sdk-react';
import './turnkey-auth-dark.css';

// Turnkey configuration with Auth Proxy
const TURNKEY_CONFIG = {
    organizationId: process.env.TURNKEY_ORGANIZATION_ID || '0ffaa29b-867e-4f62-87c8-4c29ed8cf1f9',
    authProxyPublicKey: process.env.TURNKEY_AUTH_PROXY_PUBLIC_KEY || '',
    authProxyUrl: 'https://auth.turnkey.com',
    rpId: window.location.hostname || 'localhost',
    appName: 'Agar.io Clone'
};

// Debug: Log the configuration
console.log('Turnkey Config:', TURNKEY_CONFIG);
console.log('Auth Proxy Key from env:', process.env.TURNKEY_AUTH_PROXY_PUBLIC_KEY);
console.log('Current URL:', window.location.href);
console.log('Current hostname:', window.location.hostname);

// Main component that handles authentication
function TurnkeyAuthComponent() {
    const { authIframeClient } = useTurnkey();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        // Check for existing session
        const storedUser = localStorage.getItem('turnkey_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);

                // Dispatch login event
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user }
                }));
            } catch (e) {
                console.error('Failed to parse stored user:', e);
            }
        }
    }, []);

    const handleGoogleLogin = () => {
        // Directly show the Auth component
        setShowAuth(true);
    };

    const handleAuthSuccess = (result) => {
        console.log('Authentication successful:', result);

        const userData = {
            id: result.userId || result.id || 'turnkey_user',
            name: result.username || result.email?.split('@')[0] || 'Player',
            email: result.email
        };

        // Store user data
        localStorage.setItem('turnkey_user', JSON.stringify(userData));
        setCurrentUser(userData);
        setShowAuth(false);

        // Dispatch events
        window.dispatchEvent(new CustomEvent('auth:login', {
            detail: { user: userData }
        }));

        // Close modal after delay
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('auth:hide-modal'));
        }, 1500);
    };

    const handleAuthError = (error) => {
        console.error('Authentication failed - Full error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        setError(error.message || 'Authentication failed');
        setShowAuth(false);
        setIsLoading(false);
    };

    // Show Auth component when requested
    if (showAuth) {
        // Validate config before rendering
        if (!TURNKEY_CONFIG.authProxyPublicKey) {
            console.error('Auth Proxy Public Key is missing. Please ensure TURNKEY_AUTH_PROXY_PUBLIC_KEY is set in your .env file.');
            return (
                <div style={{ textAlign: 'center', padding: '20px', color: '#ff6b6b' }}>
                    <p>Authentication configuration error.</p>
                    <p style={{ fontSize: '12px' }}>Auth Proxy Public Key is missing.</p>
                </div>
            );
        }

        return (
            <Auth
                authConfig={{
                    showTitle: false,
                    emailEnabled: true,  // Enable email for fallback
                    passkeyEnabled: true,
                    phoneEnabled: false,
                    appleEnabled: false,
                    facebookEnabled: false,
                    googleEnabled: true,
                    walletEnabled: false
                }}
                configOrder={["socials", "passkey", "email"]}
                onAuthSuccess={handleAuthSuccess}
                onError={handleAuthError}
            />
        );
    }

    // Show different UI based on state
    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="auth-spinner"></div>
                <p>Authenticating...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#ff6b6b' }}>{error}</p>
                <button
                    onClick={() => setError(null)}
                    style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (currentUser) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Welcome, {currentUser.name || 'Player'}!</p>
                <p style={{ fontSize: '12px', color: '#888' }}>You're logged in</p>
                <button
                    onClick={() => {
                        localStorage.removeItem('turnkey_user');
                        setCurrentUser(null);
                        window.dispatchEvent(new CustomEvent('auth:logout'));
                    }}
                    style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
        );
    }

    // Show the Auth component directly - it has its own Google button
    return (
        <Auth
            authConfig={{
                showTitle: false,
                emailEnabled: false,
                passkeyEnabled: true,
                phoneEnabled: false,
                appleEnabled: false,
                facebookEnabled: false,
                googleEnabled: true,
                walletEnabled: false,
                openOAuthInPage: false,
                socialLinking: true,
                sessionLengthSeconds: 3600,
                googleClientId: process.env.GOOGLE_CLIENT_ID || "268288684655-e9kafi3hpk4c9uajrcf9be9tso9f4bph.apps.googleusercontent.com"
            }}
            configOrder={["socials", "passkey"]}
            onAuthSuccess={handleAuthSuccess}
            onError={handleAuthError}
        />
    );
}

// Main App wrapper with Turnkey Provider
function TurnkeyAuthApp() {
    return (
        <TurnkeyProvider config={{
            organizationId: TURNKEY_CONFIG.organizationId,
            rpId: TURNKEY_CONFIG.rpId,
            apiBaseUrl: 'https://api.turnkey.com',
            // Auth proxy configuration
            authProxyUrl: TURNKEY_CONFIG.authProxyUrl,
            authProxyPublicKey: TURNKEY_CONFIG.authProxyPublicKey,
            // OAuth configuration
            auth: {
                oauthConfig: {
                    googleClientId: process.env.GOOGLE_CLIENT_ID || "268288684655-e9kafi3hpk4c9uajrcf9be9tso9f4bph.apps.googleusercontent.com",
                    oauthRedirectUri: window.location.origin || "http://localhost:3000"
                }
            }
        }}>
            <TurnkeyAuthComponent />
        </TurnkeyProvider>
    );
}

// Keep a reference to the root
let root = null;

// Initialize and mount the React component
function initTurnkeyAuth() {
    const container = document.getElementById('turnkey-auth-container');
    if (container) {
        // Use React 18's createRoot API
        if (!root) {
            root = ReactDOM.createRoot(container);
        }
        root.render(<TurnkeyAuthApp />);
    }
}

// Wait for DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTurnkeyAuth);
} else {
    initTurnkeyAuth();
}

// Also listen for custom event to reinitialize
window.addEventListener('turnkey:init', initTurnkeyAuth);

// Create compatibility layer for vanilla JS
window.TurnkeyAuth = {
    isAuthenticated: () => {
        const user = localStorage.getItem('turnkey_user');
        return !!user;
    },
    getUser: () => {
        const userStr = localStorage.getItem('turnkey_user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },
    getDisplayName: () => {
        const user = window.TurnkeyAuth.getUser();
        if (user) {
            return user.name || user.email?.split('@')[0] || 'Player';
        }
        return 'Guest_' + Math.floor(Math.random() * 10000);
    },
    logout: () => {
        localStorage.removeItem('turnkey_user');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        window.location.reload();
    }
};

// Export for webpack
export default TurnkeyAuthApp;