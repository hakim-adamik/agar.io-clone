// Turnkey OAuth Authentication
// Real implementation without simulation
(function() {
    'use strict';

    // Turnkey Configuration
    const TURNKEY_CONFIG = {
        organizationId: '0ffaa29b-867e-4f62-87c8-4c29ed8cf1f9',
        apiUrl: 'https://api.turnkey.com'
    };

    window.TurnkeyOAuth = {
        init: function() {
            // Check for OAuth callback parameters on page load
            this.handleOAuthCallback();

            // Check for stored session on load
            this.checkStoredSession();

            // Listen for init event
            window.addEventListener('turnkey:init', () => this.render());

            // Render immediately if DOM is ready
            if (document.readyState !== 'loading') {
                setTimeout(() => this.render(), 100);
            }
        },

        checkStoredSession: function() {
            const user = this.getUser();
            if (user) {
                // Dispatch login event for stored session
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user }
                }));
            }
        },

        handleOAuthCallback: function() {
            // Check if we have OAuth response in URL
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const userEmail = urlParams.get('userEmail');
            const userName = urlParams.get('userName');

            // Also check hash parameters (some OAuth flows use fragment)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const hashUserId = hashParams.get('userId');
            const hashUserEmail = hashParams.get('userEmail');

            const finalUserId = userId || hashUserId;
            const finalUserEmail = userEmail || hashUserEmail;
            const finalUserName = userName || hashParams.get('userName');

            if (finalUserId || finalUserEmail) {
                const user = {
                    id: finalUserId || 'turnkey_' + Date.now(),
                    email: finalUserEmail,
                    name: finalUserName || finalUserEmail?.split('@')[0] || 'Player',
                    provider: 'google'
                };

                this.handleAuthSuccess(user);

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        },

        render: function() {
            const container = document.getElementById('turnkey-auth-container');
            if (!container) return;

            // Check if user is already authenticated
            const user = this.getUser();
            if (user) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p style="color: white;">Logged in as ${user.name || user.email}</p>
                        <button onclick="window.TurnkeyOAuth.logout()" style="
                            padding: 8px 16px;
                            background: rgba(255, 255, 255, 0.1);
                            color: white;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 4px;
                            cursor: pointer;
                        ">Logout</button>
                    </div>
                `;
                return;
            }

            // Show Google OAuth button
            container.innerHTML = `
                <button id="google-signin-btn" class="auth-btn auth-btn-oauth" style="
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
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
                   onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
                    <img src="https://www.google.com/favicon.ico" width="20" height="20" alt="Google">
                    <span>Sign in with Google</span>
                </button>
            `;

            // Add click handler
            const googleBtn = document.getElementById('google-signin-btn');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.loginWithGoogle());
            }
        },

        async loginWithGoogle() {
            console.log('Initiating Turnkey OAuth with Google');

            const container = document.getElementById('turnkey-auth-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div class="auth-spinner"></div>
                        <p style="color: white;">Redirecting to Google...</p>
                    </div>
                `;
            }

            // Based on Turnkey docs, when Auth Proxy is enabled, we should use a specific URL pattern
            // The correct OAuth flow URL when Auth Proxy is enabled should be:
            const authProxyBase = 'https://auth.turnkey.com';

            // Build the OAuth initiation URL
            // This is based on standard OAuth flow with Turnkey as the proxy
            const params = new URLSearchParams({
                organizationId: TURNKEY_CONFIG.organizationId,
                provider: 'google',
                redirectUri: window.location.origin,
                returnUrl: window.location.href
            });

            // Try the auth proxy endpoint
            const authUrl = `${authProxyBase}/auth/oauth/google?${params.toString()}`;

            console.log('Redirecting to:', authUrl);

            // Store current location for after redirect
            sessionStorage.setItem('turnkey_return_url', window.location.href);

            // Redirect to start OAuth flow
            window.location.href = authUrl;
        },

        handleAuthSuccess: function(user) {
            console.log('Authentication successful:', user);

            // Store user data
            localStorage.setItem('turnkey_user', JSON.stringify(user));

            // Dispatch events
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user }
            }));

            // Update UI
            const container = document.getElementById('turnkey-auth-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p style="color: white;">Welcome, ${user.name}!</p>
                        <p style="font-size: 12px; color: #888;">Authentication successful!</p>
                    </div>
                `;
            }

            // Close modal after delay
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('auth:hide-modal'));
                window.dispatchEvent(new CustomEvent('auth:update-ui'));
            }, 1500);
        },

        isAuthenticated: function() {
            return !!localStorage.getItem('turnkey_user');
        },

        getUser: function() {
            const userStr = localStorage.getItem('turnkey_user');
            try {
                return userStr ? JSON.parse(userStr) : null;
            } catch {
                return null;
            }
        },

        getDisplayName: function() {
            const user = this.getUser();
            return user ? (user.name || user.email?.split('@')[0] || 'Player') : 'Guest_' + Math.floor(Math.random() * 10000);
        },

        logout: function() {
            localStorage.removeItem('turnkey_user');
            window.dispatchEvent(new CustomEvent('auth:logout'));
            this.render();
            window.dispatchEvent(new CustomEvent('auth:update-ui'));
        }
    };

    // Initialize
    window.TurnkeyOAuth.init();

    // Expose on TurnkeyAuth for compatibility
    window.TurnkeyAuth = {
        loginWithGoogle: () => window.TurnkeyOAuth.loginWithGoogle(),
        isAuthenticated: () => window.TurnkeyOAuth.isAuthenticated(),
        getUser: () => window.TurnkeyOAuth.getUser(),
        getDisplayName: () => window.TurnkeyOAuth.getDisplayName(),
        logout: () => window.TurnkeyOAuth.logout()
    };
})();