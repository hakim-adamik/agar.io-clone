import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLogin, useLogout } from '@privy-io/react-auth';

// Privy configuration
const PRIVY_CONFIG = {
    appId: process.env.PRIVY_APP_ID || 'YOUR_PRIVY_APP_ID', // You'll need to get this from Privy Dashboard
    config: {
        // Customize the login modal appearance
        appearance: {
            theme: 'dark',
            accentColor: '#4a90e2',
            logo: '/favicon.ico'
        },
        // Configure login methods
        loginMethods: ['email', 'google', 'discord', 'twitter'],
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
            console.log('Login successful:', user);

            // Store user data in localStorage for game access
            const userData = {
                id: user.id,
                email: user.email?.address,
                name: user.google?.name || user.discord?.username || user.twitter?.username || 'Player',
                provider: Object.keys(user).find(key => ['google', 'discord', 'twitter', 'email'].includes(key))
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
            console.log('Logout successful');
            localStorage.removeItem('privy_user');
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    });

    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        // Listen for auth modal events
        const handleShowAuth = () => setShowAuthModal(true);
        const handleHideAuth = () => setShowAuthModal(false);

        window.addEventListener('auth:show-privy', handleShowAuth);
        window.addEventListener('auth:hide-privy', handleHideAuth);

        return () => {
            window.removeEventListener('auth:show-privy', handleShowAuth);
            window.removeEventListener('auth:hide-privy', handleHideAuth);
        };
    }, []);

    // Wait for Privy to be ready
    if (!ready) {
        return (
            <div className="privy-loading">
                <div className="spinner"></div>
                <p>Loading authentication...</p>
            </div>
        );
    }

    // If user is authenticated, show their info
    if (authenticated && user) {
        const displayName = user.google?.name ||
                          user.discord?.username ||
                          user.twitter?.username ||
                          user.email?.address?.split('@')[0] ||
                          'Player';

        return (
            <div className="privy-user-info">
                <div className="user-avatar">
                    {user.google?.profilePictureUrl ? (
                        <img src={user.google.profilePictureUrl} alt={displayName} />
                    ) : (
                        <div className="avatar-placeholder">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="user-details">
                    <h3>{displayName}</h3>
                    <p className="user-email">{user.email?.address || 'No email'}</p>
                </div>
                <button onClick={logout} className="logout-btn">
                    Sign Out
                </button>
            </div>
        );
    }

    // Show login button
    return (
        <div className="privy-login-container">
            {showAuthModal ? (
                <div className="privy-auth-modal">
                    <button onClick={() => setShowAuthModal(false)} className="close-modal">
                        ×
                    </button>
                    <h2>Sign In to Clash of Cells</h2>
                    <p>Save your progress and compete on the leaderboard!</p>
                    <button onClick={login} className="privy-login-btn">
                        Sign In / Sign Up
                    </button>
                </div>
            ) : (
                <button onClick={login} className="privy-login-trigger">
                    Sign In / Register
                </button>
            )}
        </div>
    );
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
    console.log('[Privy] initPrivyAuth called');
    const container = document.getElementById('privy-auth-container');
    console.log('[Privy] Container found:', !!container);
    if (container) {
        if (!root) {
            console.log('[Privy] Creating React root');
            root = ReactDOM.createRoot(container);
        }
        console.log('[Privy] Rendering PrivyAuthApp');
        root.render(<PrivyAuthApp />);
    } else {
        console.error('[Privy] privy-auth-container not found!');
    }
}

// Wait for explicit initialization from auth-modal
console.log('[Privy] Script loaded, waiting for privy:init event');

// Only initialize when explicitly requested by auth-modal
window.addEventListener('privy:init', () => {
    console.log('[Privy] Received privy:init event');
    initPrivyAuth();
});

// Create compatibility layer for vanilla JS
window.PrivyAuth = {
    isAuthenticated: () => {
        const user = localStorage.getItem('privy_user');
        return !!user;
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
    }
};

// Export for webpack
export default PrivyAuthApp;