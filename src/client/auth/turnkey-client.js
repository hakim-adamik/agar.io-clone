// Turnkey SDK Client - Vanilla JavaScript Implementation
// Handles authentication via email, passkeys, and OAuth

// Note: For now, we'll use a simplified implementation without the full SDK
// The full SDK requires bundling which complicates the vanilla JS approach

class TurnkeyAuthClient {
    constructor() {
        this.sdk = null;
        this.authState = {
            isAuthenticated: false,
            isGuest: true,
            user: null,
            walletAddress: null,  // Hidden from UI
            sessionToken: null
        };

        // Initialize when config is ready
        this.initPromise = this.waitForConfig().then(() => this.initialize());
    }

    async waitForConfig() {
        // Wait for configuration from server
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            window.TURNKEY_CONFIG = config.turnkey;

            // Dispatch event when config is loaded
            window.dispatchEvent(new CustomEvent('turnkey:config-loaded', {
                detail: config.turnkey
            }));

            return config.turnkey;
        } catch (error) {
            console.error('Failed to load Turnkey configuration:', error);
            // Fallback to environment or default config
            const fallbackConfig = {
                organizationId: null,
                googleClientId: null,
                appleClientId: null,
                discordClientId: null
            };
            window.TURNKEY_CONFIG = fallbackConfig;

            // Still dispatch event even for fallback
            window.dispatchEvent(new CustomEvent('turnkey:config-loaded', {
                detail: fallbackConfig
            }));

            return fallbackConfig;
        }
    }

    async initialize() {
        if (!window.TURNKEY_CONFIG?.organizationId) {
            console.warn('Turnkey organization ID not configured. Authentication disabled.');
            return;
        }

        try {
            // SDK initialization would go here when properly bundled
            // For now, we'll work directly with the API endpoints
            this.sdk = {
                initialized: true,
                organizationId: window.TURNKEY_CONFIG.organizationId
            };

            // Check for existing session
            await this.checkExistingSession();
        } catch (error) {
            console.error('Failed to initialize Turnkey SDK:', error);
        }
    }

    async checkExistingSession() {
        const savedSession = localStorage.getItem('turnkey_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.expiresAt > Date.now()) {
                    // Validate session with server
                    const response = await fetch('/api/auth/validate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.updateAuthState(data);
                        return true;
                    }
                }
            } catch (error) {
                console.error('Session validation failed:', error);
            }
            localStorage.removeItem('turnkey_session');
        }
        return false;
    }

    async loginWithEmail(email) {
        await this.initPromise;

        if (!this.sdk) {
            throw new Error('Authentication not initialized');
        }

        try {
            // For now, directly call our server endpoint
            // In production, this would go through Turnkey's email verification
            const tokenResponse = await fetch('/api/auth/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    turnkeyUserId: null // Server will handle this
                })
            });

            if (tokenResponse.ok) {
                const authData = await tokenResponse.json();
                this.updateAuthState(authData);
                this.saveSession(authData);
                return authData;
            }

            throw new Error('Email authentication failed');
        } catch (error) {
            console.error('Email login error:', error);
            throw error;
        }
    }

    async loginWithPasskey() {
        await this.initPromise;

        if (!this.sdk) {
            throw new Error('Authentication not initialized');
        }

        try {
            // Check if WebAuthn is supported
            if (!window.PublicKeyCredential) {
                throw new Error('Passkeys are not supported on this device/browser');
            }

            // For demo purposes, we'll use a simplified passkey flow
            // In production, this would use the full WebAuthn API
            const tokenResponse = await fetch('/api/auth/passkey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: 'demo-passkey-' + Date.now(),
                    turnkeyUserId: null
                })
            });

            if (tokenResponse.ok) {
                const authData = await tokenResponse.json();
                this.updateAuthState(authData);
                this.saveSession(authData);
                return authData;
            }

            throw new Error('Passkey authentication failed');
        } catch (error) {
            console.error('Passkey login error:', error);
            throw error;
        }
    }

    async loginWithGoogle() {
        if (!window.TURNKEY_CONFIG?.googleClientId) {
            throw new Error('Google OAuth not configured');
        }

        return new Promise((resolve, reject) => {
            // Check if SDK is already loaded
            if (window.google?.accounts?.id) {
                this.triggerGoogleSignIn(resolve, reject);
                return;
            }

            // Load Google Sign-In SDK
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.triggerGoogleSignIn(resolve, reject);
            };
            script.onerror = () => reject(new Error('Failed to load Google Sign-In SDK'));
            document.head.appendChild(script);
        });
    }

    triggerGoogleSignIn(resolve, reject) {
        // Initialize with callback
        window.google.accounts.id.initialize({
            client_id: window.TURNKEY_CONFIG.googleClientId,
            callback: async (response) => {
                try {
                    if (response.credential) {
                        // Send credential to server for verification
                        const tokenResponse = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                credential: response.credential
                            })
                        });

                        if (tokenResponse.ok) {
                            const authData = await tokenResponse.json();
                            this.updateAuthState(authData);
                            this.saveSession(authData);
                            resolve(authData);
                        } else {
                            reject(new Error('Google authentication failed'));
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            },
            ux_mode: 'popup', // Use popup instead of redirect
            auto_select: false,
            itp_support: true
        });

        // Create a temporary button to trigger sign-in
        const tempBtn = document.createElement('div');
        tempBtn.id = 'google-signin-temp';
        tempBtn.style.display = 'none';
        document.body.appendChild(tempBtn);

        // Render the button
        window.google.accounts.id.renderButton(
            tempBtn,
            {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'continue_with',
                logo_alignment: 'left',
                click_listener: () => {}
            }
        );

        // Click the button programmatically
        setTimeout(() => {
            const googleBtn = tempBtn.querySelector('div[role="button"]');
            if (googleBtn) {
                googleBtn.click();
            }
            // Clean up
            setTimeout(() => tempBtn.remove(), 100);
        }, 100);
    }

    async logout() {
        try {
            // Notify server
            if (this.authState.sessionToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authState.sessionToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Clear local state
        this.authState = {
            isAuthenticated: false,
            isGuest: true,
            user: null,
            walletAddress: null,
            sessionToken: null
        };

        localStorage.removeItem('turnkey_session');

        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    updateAuthState(authData) {
        this.authState = {
            isAuthenticated: true,
            isGuest: false,
            user: authData.user,
            walletAddress: authData.walletAddress,  // Store but don't expose in UI
            sessionToken: authData.token
        };

        // Dispatch authentication event
        window.dispatchEvent(new CustomEvent('auth:login', {
            detail: {
                user: authData.user,
                isAuthenticated: true
            }
        }));
    }

    saveSession(authData) {
        const session = {
            token: authData.token,
            user: authData.user,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)  // 7 days
        };
        localStorage.setItem('turnkey_session', JSON.stringify(session));
    }

    getDisplayName() {
        if (this.authState.isAuthenticated && this.authState.user) {
            return this.authState.user.displayName ||
                   this.authState.user.email?.split('@')[0] ||
                   'Player';
        }
        return 'Guest_' + Math.floor(Math.random() * 10000);
    }

    isAuthenticated() {
        return this.authState.isAuthenticated;
    }

    getUser() {
        return this.authState.user;
    }
}

// Export as singleton
window.TurnkeyAuth = new TurnkeyAuthClient();