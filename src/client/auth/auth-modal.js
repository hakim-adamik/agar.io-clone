// Authentication Modal - Vanilla JavaScript UI for Privy integration
// Provides login/signup interface that integrates with Privy React component

(function() {
    'use strict';

    class AuthModal {
        constructor() {
            this.modal = null;
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
            window.addEventListener('auth:login', (e) => this.onAuthSuccess(e.detail));
            window.addEventListener('auth:logout', () => this.onAuthLogout());
            window.addEventListener('auth:error', (e) => this.onAuthError(e.detail));
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
                        <h2>Welcome to Clash of Cells</h2>
                        <p>Sign in to save your progress and compete!</p>
                    </div>
                    <div class="auth-modal-body">
                        <!-- Privy Auth Component Container -->
                        <div id="privy-auth-container"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modal);
            this.attachEventListeners();

            // Initialize Privy React component after modal is in DOM
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                console.log('[AuthModal] Triggering Privy initialization');
                this.initPrivy();
            }, 100);
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

        initPrivy() {
            // Trigger Privy React component initialization
            console.log('[AuthModal] Dispatching privy:init event');
            window.dispatchEvent(new CustomEvent('privy:init'));
        }

        onAuthSuccess(detail) {
            const { user, isNewUser } = detail || {};
            console.log('Auth success:', user);

            // Update UI to show authenticated state
            this.updateProfileButton(user);

            // Show success message
            this.showSuccessMessage(user, isNewUser);

            // Hide modal after success
            setTimeout(() => {
                this.hide();
                // Update game UI
                window.dispatchEvent(new CustomEvent('auth:update-ui'));
            }, 1500);
        }

        onAuthLogout() {
            console.log('User logged out');

            // Update UI to show guest state
            this.updateProfileButton(null);

            // Refresh UI
            window.dispatchEvent(new CustomEvent('auth:update-ui'));
        }

        onAuthError(detail) {
            const { error } = detail || {};
            console.error('Auth error:', error);

            // Show error message
            this.showErrorMessage(error);
        }

        updateProfileButton(user) {
            // Update the profile button in the landing page
            const profileBtn = document.querySelector('[data-section="profile"]');
            if (profileBtn) {
                if (user) {
                    profileBtn.innerHTML = `
                        <i class="fas fa-user-check"></i>
                        <span>${user.name || 'Player'}</span>
                    `;
                    profileBtn.classList.add('authenticated');
                } else {
                    profileBtn.innerHTML = `
                        <i class="fas fa-user"></i>
                        <span>Profile</span>
                    `;
                    profileBtn.classList.remove('authenticated');
                }
            }
        }

        showSuccessMessage(user, isNewUser) {
            const container = this.modal.querySelector('.auth-modal-body');
            if (container) {
                const message = isNewUser ?
                    'Welcome to Clash of Cells!' :
                    `Welcome back, ${user.name || 'Player'}!`;

                container.innerHTML = `
                    <div class="auth-success">
                        <div class="success-icon">✓</div>
                        <h3>${message}</h3>
                        <p>You're now signed in!</p>
                    </div>
                `;
            }
        }

        showErrorMessage(error) {
            const container = this.modal.querySelector('.auth-modal-body');
            if (container) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'auth-error';
                errorDiv.innerHTML = `
                    <p class="error-message">${error || 'Authentication failed. Please try again.'}</p>
                `;

                // Insert at top of container
                container.insertBefore(errorDiv, container.firstChild);

                // Remove error after 5 seconds
                setTimeout(() => {
                    errorDiv.remove();
                }, 5000);
            }
        }

        show() {
            if (this.modal) {
                this.modal.classList.remove('hidden');
                // Trigger Privy modal
                window.dispatchEvent(new CustomEvent('auth:show-privy'));
            }
        }

        hide() {
            if (this.modal) {
                this.modal.classList.add('hidden');
                window.dispatchEvent(new CustomEvent('auth:hide-privy'));
            }
        }
    }

    // Initialize auth modal
    window.AuthModal = new AuthModal();

    // Make auth functions globally available
    window.showAuthModal = function() {
        window.AuthModal.show();
    };

    window.hideAuthModal = function() {
        window.AuthModal.hide();
    };
})();