// Simple Turnkey Auth using their Auth Proxy
(function() {
    'use strict';

    // Configuration
    const TURNKEY_CONFIG = {
        organizationId: '0ffaa29b-867e-4f62-87c8-4c29ed8cf1f9',
        authProxyUrl: 'https://auth.turnkey.com',
        redirectUrl: window.location.origin
    };

    class TurnkeyAuthSimple {
        constructor() {
            this.user = null;
            this.init();
        }

        init() {
            // Check for stored session
            const storedUser = localStorage.getItem('turnkey_user');
            if (storedUser) {
                try {
                    this.user = JSON.parse(storedUser);
                    this.dispatchAuthEvent('login');
                } catch (e) {
                    console.error('Failed to parse stored user:', e);
                }
            }

            // Listen for auth init events
            window.addEventListener('turnkey:init', () => this.setupAuthButtons());
        }

        setupAuthButtons() {
            const container = document.getElementById('turnkey-auth-container');
            if (!container) return;

            // Clear and add Google OAuth button
            container.innerHTML = `
                <button id="turnkey-google-btn" class="auth-btn auth-btn-oauth" style="
                    width: 100%;
                    padding: 12px;
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    <img src="https://www.google.com/favicon.ico" width="20" height="20" alt="Google">
                    <span>Sign in with Google</span>
                </button>
            `;

            // Add click handler
            const googleBtn = document.getElementById('turnkey-google-btn');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.loginWithGoogle());
            }
        }

        loginWithGoogle() {
            // Build the OAuth URL for Turnkey's Auth Proxy
            const params = new URLSearchParams({
                organizationId: TURNKEY_CONFIG.organizationId,
                provider: 'google',
                redirectUrl: TURNKEY_CONFIG.redirectUrl,
                mode: 'login'
            });

            // Redirect to Turnkey Auth Proxy
            const authUrl = `${TURNKEY_CONFIG.authProxyUrl}/oauth/start?${params.toString()}`;
            window.location.href = authUrl;
        }

        handleCallback() {
            // Check if we're returning from OAuth
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                // Exchange code for user info
                this.exchangeCode(code, state);
            }
        }

        async exchangeCode(code, state) {
            try {
                // Call Turnkey to exchange the code
                const response = await fetch(`${TURNKEY_CONFIG.authProxyUrl}/oauth/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code,
                        state,
                        organizationId: TURNKEY_CONFIG.organizationId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.handleAuthSuccess(data);
                }
            } catch (error) {
                console.error('Failed to exchange OAuth code:', error);
            }
        }

        handleAuthSuccess(data) {
            this.user = {
                id: data.userId || data.sub,
                email: data.email,
                name: data.name,
                picture: data.picture,
                provider: 'google'
            };

            // Store in localStorage
            localStorage.setItem('turnkey_user', JSON.stringify(this.user));

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Dispatch events
            this.dispatchAuthEvent('login');

            // Close modal
            window.dispatchEvent(new CustomEvent('auth:hide-modal'));
        }

        logout() {
            this.user = null;
            localStorage.removeItem('turnkey_user');
            this.dispatchAuthEvent('logout');
        }

        isAuthenticated() {
            return !!this.user;
        }

        getUser() {
            return this.user;
        }

        getDisplayName() {
            if (this.user) {
                return this.user.name || this.user.email?.split('@')[0] || 'Player';
            }
            return 'Guest_' + Math.floor(Math.random() * 10000);
        }

        dispatchAuthEvent(type) {
            window.dispatchEvent(new CustomEvent(`auth:${type}`, {
                detail: {
                    user: this.user,
                    isAuthenticated: !!this.user
                }
            }));

            if (type === 'login') {
                window.dispatchEvent(new CustomEvent('auth:update-ui'));
            }
        }
    }

    // Initialize
    window.TurnkeyAuthSimple = new TurnkeyAuthSimple();

    // Create compatibility layer
    window.TurnkeyAuth = {
        loginWithGoogle: () => window.TurnkeyAuthSimple.loginWithGoogle(),
        logout: () => window.TurnkeyAuthSimple.logout(),
        isAuthenticated: () => window.TurnkeyAuthSimple.isAuthenticated(),
        getUser: () => window.TurnkeyAuthSimple.getUser(),
        getDisplayName: () => window.TurnkeyAuthSimple.getDisplayName()
    };

    // Check for OAuth callback on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.TurnkeyAuthSimple.handleCallback();
        });
    } else {
        window.TurnkeyAuthSimple.handleCallback();
    }
})();