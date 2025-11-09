import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLogin, useLogout } from '@privy-io/react-auth';

// Privy configuration
// Read from window.ENV injected by server, fallback to process.env for local dev
const PRIVY_CONFIG = {
    appId: (typeof window !== 'undefined' && window.ENV && window.ENV.PRIVY_APP_ID) || process.env.PRIVY_APP_ID || 'YOUR_PRIVY_APP_ID',
    config: {
        // Customize the login modal appearance
        appearance: {
            theme: 'dark',
            accentColor: '#4a90e2',
            logo: '/favicon.ico'
        },
        // Configure login methods
        loginMethods: ['google', 'discord', 'email'],
        // Configure embedded wallets (optional, for future Web3 features)
        embeddedWallets: {
            createOnLogin: 'users-without-wallets'
        }
    }
};

// Main authentication component
function PrivyAuthComponent() {
    const { ready, authenticated, user } = usePrivy();
    const { login } = useLogin({
        onComplete: async (authData) => {
            // The actual user object is nested inside authData.user
            const user = authData.user;
            const isNewUser = authData.isNewUser;

            // Log the full user object to debug structure
            console.log('[Privy Auth] Full auth data:', authData);
            console.log('[Privy Auth] Actual user object:', user);

            // Extract linked account data (Google, Discord, etc.)
            const linkedAccount = user.linkedAccounts?.[0];
            const providerType = linkedAccount?.type || 'email';

            // Store user data in localStorage for game access
            const userData = {
                id: user.id,
                email: user.email?.address || linkedAccount?.email,
                name: linkedAccount?.name || linkedAccount?.username || 'Player',
                provider: providerType
            };

            // Log Privy user data for debugging
            console.log('[Privy Auth] User authenticated:', {
                privyId: user.id,
                email: userData.email,
                name: userData.name,
                provider: userData.provider
            });

            // Skip API call if no Privy ID
            if (!user.id) {
                console.error('[Auth] User object missing ID:', user);
                localStorage.setItem('privy_user', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user: userData, isNewUser }
                }));
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('auth:hide-modal'));
                }, 1000);
                return;
            }

            // Call database API to create/update user
            try {
                // Dynamic port detection based on current location
                const currentPort = window.location.port || '80';
                const apiUrl = currentPort === '3000'
                    ? '/api/auth'
                    : (currentPort === '8080'
                        ? '/api/auth'
                        : `http://localhost:${currentPort}/api/auth`);

                const requestBody = {
                    privyId: user.id,
                    email: userData.email,
                    username: userData.name,
                    authProvider: userData.provider,
                    avatarUrl: linkedAccount?.profilePictureUrl || linkedAccount?.avatarUrl || null
                };

                console.log('[Auth] Sending to /api/auth:', requestBody, 'URL:', apiUrl);

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const dbUser = await response.json();

                    // Store both Privy and database user data
                    userData.dbUserId = dbUser.user.id;
                    userData.username = dbUser.user.username;
                    userData.stats = dbUser.stats;
                    userData.preferences = dbUser.preferences;

                    console.log('[Auth] Database user created/updated:', dbUser);
                } else {
                    const errorText = await response.text();
                    console.error('[Auth] Failed to sync with database. Status:', response.status, 'Response:', errorText);
                }
            } catch (error) {
                console.error('[Auth] Failed to sync with database:', error);
                // Continue anyway - user can still play as guest
            }

            localStorage.setItem('privy_user', JSON.stringify(userData));

            // Dispatch login event with database info
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user: userData, isNewUser }
            }));

            // Close modal after successful login
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('auth:hide-modal'));
            }, 1000);
        },
        onError: (error) => {
            console.error('Login failed:', error);
            window.dispatchEvent(new CustomEvent('auth:error', {
                detail: { error: error.message }
            }));
        }
    });

    const { logout } = useLogout({
        onSuccess: () => {
            localStorage.removeItem('privy_user');
            // Immediately update global state
            window.PrivyAuthState.authenticated = false;
            window.PrivyAuthState.user = null;
            window.dispatchEvent(new CustomEvent('auth:logout'));

            // Force page reload after logout to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    });

    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        // Listen for auth modal events
        const handleShowAuth = () => {
            login(); // Directly open Privy login instead of showing intermediate modal
        };
        const handleHideAuth = () => setShowAuthModal(false);
        const handleTriggerLogout = () => {
            if (authenticated) {
                // Wrap in try-catch to handle any potential errors
                try {
                    logout();
                } catch (error) {
                    console.error('Logout error:', error);
                    // Clear local state even if logout fails
                    localStorage.removeItem('privy_user');
                    window.PrivyAuthState.authenticated = false;
                    window.PrivyAuthState.user = null;
                    window.dispatchEvent(new CustomEvent('auth:logout'));

                    // Force reload to clean state
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                }
            } else {
                localStorage.removeItem('privy_user');
                window.PrivyAuthState.authenticated = false;
                window.PrivyAuthState.user = null;
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
        };

        window.addEventListener('auth:show-privy', handleShowAuth);
        window.addEventListener('auth:hide-privy', handleHideAuth);
        window.addEventListener('auth:trigger-logout', handleTriggerLogout);

        return () => {
            window.removeEventListener('auth:show-privy', handleShowAuth);
            window.removeEventListener('auth:hide-privy', handleHideAuth);
            window.removeEventListener('auth:trigger-logout', handleTriggerLogout);
        };
    }, [authenticated, logout]);

    // Keep global state synchronized with React state
    useEffect(() => {
        window.PrivyAuthState.authenticated = authenticated;
        window.PrivyAuthState.user = user;
    }, [authenticated, user]);

    // Wait for Privy to be ready
    if (!ready) {
        return (
            <div className="privy-loading">
                <div className="spinner"></div>
                <p>Loading authentication...</p>
            </div>
        );
    }

    // Don't render any visible UI - this component just handles authentication logic
    // The Privy SDK will show its own modal when login() is called
    return <div style={{display: 'none'}} />;
}

// Main App wrapper with PrivyProvider
function PrivyAuthApp() {
    return (
        <PrivyProvider
            appId={PRIVY_CONFIG.appId}
            config={PRIVY_CONFIG.config}
        >
            <PrivyAuthComponent />
        </PrivyProvider>
    );
}

// Keep a reference to the root
let root = null;

// Initialize and mount the React component
function initPrivyAuth() {
    const container = document.getElementById('privy-auth-container');
    if (container) {
        if (!root) {
            root = ReactDOM.createRoot(container);
        }
        root.render(<PrivyAuthApp />);
    } else {
        console.error('[Privy] privy-auth-container not found!');
    }
}

// Wait for explicit initialization from auth-modal

// Only initialize when explicitly requested by auth-modal
window.addEventListener('privy:init', () => {
    initPrivyAuth();
});

// Create compatibility layer for vanilla JS
// Store authentication state globally for synchronization
window.PrivyAuthState = {
    authenticated: false,
    user: null
};

window.PrivyAuth = {
    isAuthenticated: () => {
        // Check both localStorage and global state for accuracy
        const localUser = localStorage.getItem('privy_user');
        return !!localUser && window.PrivyAuthState.authenticated;
    },
    getUser: () => {
        const userStr = localStorage.getItem('privy_user');
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
        const user = window.PrivyAuth.getUser();
        if (user) {
            return user.name || 'Player';
        }
        return 'Guest_' + Math.floor(Math.random() * 10000);
    },
    showLogin: () => {
        window.dispatchEvent(new CustomEvent('auth:show-privy'));
    },
    hideLogin: () => {
        window.dispatchEvent(new CustomEvent('auth:hide-privy'));
    },
    logout: () => {
        window.dispatchEvent(new CustomEvent('auth:trigger-logout'));
    }
};

// Export for webpack
export default PrivyAuthApp;