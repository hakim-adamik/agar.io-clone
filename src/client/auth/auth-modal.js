// Authentication Modal - Vanilla JavaScript UI
// Provides login/signup interface for Turnkey authentication

(function() {
    'use strict';

    class AuthModal {
        constructor() {
            this.modal = null;
            this.currentView = 'login';
            this.init();
        }

        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.createModal());
            } else {
                this.createModal();
            }

            // Listen for auth events
            window.addEventListener('auth:show-modal', () => this.show());
            window.addEventListener('auth:hide-modal', () => this.hide());
            window.addEventListener('auth:login', () => this.onAuthSuccess());

            // Re-setup OAuth buttons when config is loaded
            window.addEventListener('turnkey:config-loaded', () => this.setupOAuthButtons());
        }

        createModal() {
            // Create modal container
            this.modal = document.createElement('div');
            this.modal.id = 'auth-modal';
            this.modal.className = 'auth-modal hidden';
            this.modal.innerHTML = `
                <div class="auth-modal-overlay"></div>
                <div class="auth-modal-content">
                    <button class="auth-modal-close">&times;</button>
                    <div class="auth-modal-header">
                        <h2>Sign In to Clash of Cells</h2>
                        <p>Save your progress and compete on the leaderboard!</p>
                    </div>
                    <div class="auth-modal-body">
                        <!-- Login View -->
                        <div id="auth-login-view" class="auth-view">
                            <div class="auth-methods">
                                <!-- Email Login -->
                                <div class="auth-method-email">
                                    <input type="email"
                                           id="auth-email-input"
                                           placeholder="Enter your email"
                                           class="auth-input">
                                    <button id="auth-email-btn" class="auth-btn auth-btn-primary">
                                        Continue with Email
                                    </button>
                                </div>

                                <div class="auth-divider">
                                    <span>OR</span>
                                </div>

                                <!-- Passkey Login -->
                                <button id="auth-passkey-btn" class="auth-btn auth-btn-secondary">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
                                    </svg>
                                    Sign in with Passkey
                                </button>

                                <!-- OAuth Options -->
                                <div id="auth-oauth-options" class="auth-oauth-options"></div>
                            </div>

                            <div class="auth-footer">
                                <p>New to Clash of Cells? Sign up with any method above!</p>
                                <button id="auth-guest-continue" class="auth-link-btn">
                                    Continue as Guest
                                </button>
                            </div>
                        </div>

                        <!-- Loading View -->
                        <div id="auth-loading-view" class="auth-view hidden">
                            <div class="auth-loading">
                                <div class="auth-spinner"></div>
                                <p>Authenticating...</p>
                            </div>
                        </div>

                        <!-- Success View -->
                        <div id="auth-success-view" class="auth-view hidden">
                            <div class="auth-success">
                                <div class="auth-success-icon">✓</div>
                                <h3>Welcome back!</h3>
                                <p id="auth-success-message">You're now signed in</p>
                            </div>
                        </div>

                        <!-- Error View -->
                        <div id="auth-error-view" class="auth-view hidden">
                            <div class="auth-error">
                                <div class="auth-error-icon">!</div>
                                <h3>Authentication Failed</h3>
                                <p id="auth-error-message">Something went wrong. Please try again.</p>
                                <button id="auth-retry-btn" class="auth-btn auth-btn-primary">
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modal);
            this.attachEventListeners();
            this.setupOAuthButtons();
        }

        attachEventListeners() {
            // Close button
            const closeBtn = this.modal.querySelector('.auth-modal-close');
            closeBtn.addEventListener('click', () => this.hide());

            // Overlay click
            const overlay = this.modal.querySelector('.auth-modal-overlay');
            overlay.addEventListener('click', () => this.hide());

            // Email authentication
            const emailBtn = document.getElementById('auth-email-btn');
            const emailInput = document.getElementById('auth-email-input');

            emailBtn.addEventListener('click', () => this.handleEmailAuth());
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleEmailAuth();
            });

            // Passkey authentication
            const passkeyBtn = document.getElementById('auth-passkey-btn');
            passkeyBtn.addEventListener('click', () => this.handlePasskeyAuth());

            // Guest continue
            const guestBtn = document.getElementById('auth-guest-continue');
            guestBtn.addEventListener('click', () => this.hide());

            // Retry button
            const retryBtn = document.getElementById('auth-retry-btn');
            retryBtn.addEventListener('click', () => this.showView('login'));
        }

        setupOAuthButtons() {
            const container = document.getElementById('auth-oauth-options');
            if (!container) {
                return;
            }

            // Clear existing buttons
            container.innerHTML = '';

            // Check for configured OAuth providers
            if (window.TURNKEY_CONFIG?.googleClientId) {
                const googleBtn = document.createElement('button');
                googleBtn.id = 'auth-google-btn';
                googleBtn.className = 'auth-btn auth-btn-oauth auth-btn-google';
                googleBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                `;
                googleBtn.addEventListener('click', () => this.handleGoogleAuth());
                container.appendChild(googleBtn);
            }

            // Add more OAuth providers here as needed
            // if (window.TURNKEY_CONFIG?.discordClientId) { ... }
            // if (window.TURNKEY_CONFIG?.appleClientId) { ... }
        }

        async handleEmailAuth() {
            const emailInput = document.getElementById('auth-email-input');
            const email = emailInput.value.trim();

            if (!email || !this.validateEmail(email)) {
                this.showError('Please enter a valid email address');
                return;
            }

            this.showView('loading');

            try {
                await window.TurnkeyAuth.loginWithEmail(email);
                this.onAuthSuccess();
            } catch (error) {
                console.error('Email auth failed:', error);
                this.showError('Failed to authenticate with email. Please try again.');
            }
        }

        async handlePasskeyAuth() {
            this.showView('loading');

            try {
                await window.TurnkeyAuth.loginWithPasskey();
                this.onAuthSuccess();
            } catch (error) {
                console.error('Passkey auth failed:', error);
                this.showError(error.message || 'Passkey authentication failed. Please try again.');
            }
        }

        async handleGoogleAuth() {
            this.showView('loading');

            try {
                await window.TurnkeyAuth.loginWithGoogle();
                this.onAuthSuccess();
            } catch (error) {
                console.error('Google auth failed:', error);
                this.showError('Google authentication failed. Please try again.');
            }
        }

        onAuthSuccess() {
            const user = window.TurnkeyAuth.getUser();
            const message = `Welcome, ${user?.displayName || user?.email || 'Player'}!`;

            document.getElementById('auth-success-message').textContent = message;
            this.showView('success');

            // Hide modal after success
            setTimeout(() => {
                this.hide();
                // Refresh UI or trigger game updates
                window.dispatchEvent(new CustomEvent('auth:update-ui'));
            }, 1500);
        }

        showView(viewName) {
            // Hide all views
            const views = this.modal.querySelectorAll('.auth-view');
            views.forEach(view => view.classList.add('hidden'));

            // Show requested view
            const targetView = document.getElementById(`auth-${viewName}-view`);
            if (targetView) {
                targetView.classList.remove('hidden');
            }
        }

        showError(message) {
            document.getElementById('auth-error-message').textContent = message;
            this.showView('error');
        }

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        show() {
            if (this.modal) {
                this.modal.classList.remove('hidden');
                this.showView('login');
                // Focus email input
                setTimeout(() => {
                    document.getElementById('auth-email-input')?.focus();
                }, 100);
            }
        }

        hide() {
            if (this.modal) {
                this.modal.classList.add('hidden');
            }
        }
    }

    // Initialize auth modal
    window.AuthModal = new AuthModal();
})();