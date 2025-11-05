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
        onComplete: (user, isNewUser) => {

            // Store user data in localStorage for game access
            const userData = {
                id: user.id,
                email: user.email?.address,
                name: user.google?.name || user.discord?.username || 'Player',
                provider: Object.keys(user).find(key => ['google', 'discord', 'email'].includes(key))
            };

            localStorage.setItem('privy_user', JSON.stringify(userData));

            // Dispatch login event
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
        },
        onError: (error) => {
            console.error('Logout failed:', error);
            // Even if logout fails on Privy side, clear local state
            localStorage.removeItem('privy_user');
            window.PrivyAuthState.authenticated = false;
            window.PrivyAuthState.user = null;
            window.dispatchEvent(new CustomEvent('auth:logout'));
            window.dispatchEvent(new CustomEvent('auth:error', {
                detail: { error: 'Logout failed, but local session cleared' }
            }));

            // Force page reload even on error to ensure clean state
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
                logout();
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