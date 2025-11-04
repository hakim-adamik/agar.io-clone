// Simple Google OAuth Button
(function() {
    'use strict';

    window.GoogleAuthButton = {
        init: function() {
            // Listen for init event
            window.addEventListener('turnkey:init', () => this.render());

            // Render immediately if DOM is ready
            if (document.readyState !== 'loading') {
                setTimeout(() => this.render(), 100);
            }
        },

        render: function() {
            const container = document.getElementById('turnkey-auth-container');
            if (!container) return;

            // Clear and add Google OAuth button
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
                googleBtn.addEventListener('click', () => this.handleGoogleLogin());
            }
        },

        handleGoogleLogin: function() {
            console.log('Google login clicked');

            // Show loading state
            const container = document.getElementById('turnkey-auth-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div class="auth-spinner"></div>
                        <p style="color: white;">Authenticating with Google...</p>
                    </div>
                `;
            }

            // For now, simulate success
            setTimeout(() => {
                const user = {
                    id: 'google_' + Math.random().toString(36).substr(2, 9),
                    email: 'player@gmail.com',
                    name: 'Player_' + Math.floor(Math.random() * 10000),
                    provider: 'google'
                };

                // Store user
                localStorage.setItem('turnkey_user', JSON.stringify(user));

                // Dispatch events
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user }
                }));

                // Show success
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p style="color: white;">Welcome, ${user.name}!</p>
                        <p style="font-size: 12px; color: #888;">You can now close this modal.</p>
                    </div>
                `;

                // Close modal after delay
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('auth:hide-modal'));
                    window.dispatchEvent(new CustomEvent('auth:update-ui'));
                }, 1500);
            }, 1000);
        }
    };

    // Initialize
    window.GoogleAuthButton.init();

    // Also expose on TurnkeyAuth for compatibility
    window.TurnkeyAuth = window.TurnkeyAuth || {};
    window.TurnkeyAuth.loginWithGoogle = () => window.GoogleAuthButton.handleGoogleLogin();
    window.TurnkeyAuth.isAuthenticated = () => !!localStorage.getItem('turnkey_user');
    window.TurnkeyAuth.getUser = () => {
        const userStr = localStorage.getItem('turnkey_user');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    };
    window.TurnkeyAuth.getDisplayName = () => {
        const user = window.TurnkeyAuth.getUser();
        return user ? (user.name || user.email?.split('@')[0] || 'Player') : 'Guest_' + Math.floor(Math.random() * 10000);
    };
    window.TurnkeyAuth.logout = () => {
        localStorage.removeItem('turnkey_user');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        window.location.reload();
    };
})();