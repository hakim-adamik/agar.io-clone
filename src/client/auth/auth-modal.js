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
                        <!-- Turnkey Auth Component Container -->
                        <div id="turnkey-auth-container" style="width: 100%;"></div>
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
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Overlay click
            const overlay = this.modal.querySelector('.auth-modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.hide());
            }
        }

        setupOAuthButtons() {
            // The turnkey-auth-container is already in the HTML
            // Just trigger the React component to initialize
            window.dispatchEvent(new CustomEvent('turnkey:init'));
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

        async handleTurnkeyLogin(provider) {
            this.showView('loading');

            try {
                // Turnkey React component will handle this
                if (window.TurnkeyAuthReact && window.TurnkeyAuthReact.loginWithProvider) {
                    await window.TurnkeyAuthReact.loginWithProvider(provider);
                } else {
                    console.error('Turnkey React auth not initialized');
                    this.showError('Authentication system not ready. Please try again.');
                }
            } catch (error) {
                console.error('Turnkey login failed:', error);
                this.showError('Authentication failed. Please try again.');
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
            console.log('Auth success:', user);

            // Hide modal after success
            setTimeout(() => {
                this.hide();
                // Refresh UI or trigger game updates
                window.dispatchEvent(new CustomEvent('auth:update-ui'));
            }, 1500);
        }

        showView(viewName) {
            // No longer needed - Turnkey handles its own views
            console.log('View requested:', viewName);
        }

        showError(message) {
            // Log error - Turnkey handles its own error display
            console.error('Auth error:', message);
        }

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        show() {
            if (this.modal) {
                this.modal.classList.remove('hidden');
                // Trigger React component initialization
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('turnkey:init'));
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