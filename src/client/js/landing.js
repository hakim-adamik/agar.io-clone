// Sound utility functions - global scope for inline onclick handlers
function isLandingSoundEnabled() {
    // Check if sound is enabled via the preference checkbox
    const soundEnabledEl = document.getElementById('pref-soundEnabled');
    if (soundEnabledEl) {
        return soundEnabledEl.checked;
    }

    // Fallback: check DEFAULT_PREFERENCES or use true as default
    const defaults = window.DEFAULT_PREFERENCES || {};
    return defaults.soundEnabled !== false; // Default to true
}

function playClickSound() {
    if (!isLandingSoundEnabled()) return;

    try {
        const clickSound = document.getElementById('click_sound');
        if (clickSound) {
            clickSound.volume = 0.5; // 50% volume for UI sounds
            clickSound.currentTime = 0; // Reset to start
            clickSound.play().catch(function(e) {
                console.log('Click sound playback failed:', e);
            });
        }
    } catch (e) {
        console.log('Click sound not available:', e);
    }
}

// Hamburger menu functionality
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const profileBtnMobile = document.getElementById('profileBtnMobile');

    if (!hamburgerBtn || !mobileMenu) return;

    // Toggle menu function
    function toggleMenu(open) {
        if (open === undefined) {
            open = !mobileMenu.classList.contains('active');
        }

        if (open) {
            mobileMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        } else {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            document.body.style.overflow = ''; // Restore body scroll
        }

        // Play sound on menu toggle
        playClickSound();
    }

    // Hamburger button click
    hamburgerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleMenu();
    });

    // Close button click
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu(false);
        });
    }

    // Overlay click
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu(false);
        });
    }

    // Mobile navigation items
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');
    mobileNavItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');

            // Close menu first
            toggleMenu(false);

            // Find and click the corresponding desktop nav item to trigger its modal
            const desktopNavItem = document.querySelector(`.nav-item[data-section="${section}"]`);
            if (desktopNavItem) {
                desktopNavItem.click();
            } else {
                console.log('Navigate to', section);
            }

            playClickSound();
        });
    });

    // Profile button on mobile
    if (profileBtnMobile) {
        profileBtnMobile.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu(false);

            // Trigger profile modal (same as desktop)
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                profileBtn.click();
            }
        });
    }
}

// Landing page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const TRANSITION_DELAY = 300;
    const GAME_URL = 'index.html';

    function playMenuSelectionSound() {
        if (!isLandingSoundEnabled()) return;

        try {
            const menuSound = document.getElementById('menu_selection_sound');
            if (menuSound) {
                menuSound.volume = 0.5; // 50% volume for UI sounds
                menuSound.currentTime = 0; // Reset to start
                menuSound.play().catch(function(e) {
                    console.log('Menu selection sound playback failed:', e);
                });
            }
        } catch (e) {
            console.log('Menu selection sound not available:', e);
        }
    }

    // Cached DOM elements
    const elements = {
        playBtn: document.getElementById('playBtn'),
        howToPlayBtn: document.getElementById('howToPlayBtn'),
        startFromTutorial: document.getElementById('startFromTutorial'),
        tutorialModal: document.getElementById('tutorialModal'),
        navItems: document.querySelectorAll('.nav-item')
    };

    // Modal content templates
    const modalTemplates = {
        playChoice: {
            title: 'Welcome to the Arena',
            dynamic: true,
            getContent: function() {
                return `
                    <div style="text-align: center; padding: 0.5rem 0;">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1rem 0; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));"
                             class="play-options-grid">
                            <!-- Guest Option (shows first on desktop, second on mobile) -->
                            <div class="play-option-card guest-option" style="background: linear-gradient(135deg, rgba(108, 117, 125, 0.15), rgba(73, 80, 87, 0.1)); border: 1px solid rgba(108, 117, 125, 0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; min-height: 320px;"
                                 onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 25px rgba(108, 117, 125, 0.3)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                                 onclick="window.playAsGuest()">
                                <div style="width: 70px; height: 70px; margin: 0 auto 1rem; background: linear-gradient(135deg, #6c757d, #495057); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-user-secret" style="font-size: 1.8rem; color: white;"></i>
                                </div>
                                <h3 style="color: white; margin-bottom: 0.5rem; font-size: 1.2rem;">Play as Guest</h3>
                                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: auto; line-height: 1.3;">
                                    Jump in immediately and enjoy the game for free
                                </p>
                                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 6px; padding: 0.6rem; margin: 1rem 0;">
                                    <p style="color: #FFC107; margin: 0; font-size: 0.75rem;">
                                        <i class="fas fa-info-circle" style="margin-right: 0.4rem;"></i>
                                        No earnings or progress saved
                                    </p>
                                </div>
                                <button class="modal-button" style="background: linear-gradient(135deg, #6c757d, #495057); border: none; width: 100%; padding: 0.75rem; font-weight: 600; margin-top: auto;">
                                    Play Now
                                </button>
                            </div>

                            <!-- Sign Up Option (shows second on desktop, first on mobile) -->
                            <div class="play-option-card signup-option" style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.15), rgba(80, 227, 194, 0.1)); border: 1px solid rgba(74, 144, 226, 0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; min-height: 320px;"
                                 onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 25px rgba(74, 144, 226, 0.3)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                                 onclick="window.signUpToPlay()">
                                <div style="position: absolute; top: -8px; right: 12px; background: linear-gradient(135deg, #FFD700, #FFA500); color: white; padding: 0.2rem 0.6rem; border-radius: 16px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">
                                    Recommended
                                </div>
                                <div style="width: 70px; height: 70px; margin: 0 auto 1rem; background: linear-gradient(135deg, #4a90e2, #50e3c2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-trophy" style="font-size: 1.8rem; color: white;"></i>
                                </div>
                                <h3 style="color: white; margin-bottom: 0.5rem; font-size: 1.2rem;">Sign Up & Compete</h3>
                                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: auto; line-height: 1.3;">
                                    Are you bullish enough to dominate the arena?
                                </p>
                                <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 6px; padding: 0.6rem; margin: 1rem 0;">
                                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                        <div style="display: flex; align-items: center; color: #4CAF50; font-size: 0.75rem;">
                                            <i class="fas fa-check" style="margin-right: 0.4rem;"></i>
                                            Earn virtual currency
                                        </div>
                                        <div style="display: flex; align-items: center; color: #4CAF50; font-size: 0.75rem;">
                                            <i class="fas fa-check" style="margin-right: 0.4rem;"></i>
                                            Track your progress
                                        </div>
                                        <div style="display: flex; align-items: center; color: #4CAF50; font-size: 0.75rem;">
                                            <i class="fas fa-check" style="margin-right: 0.4rem;"></i>
                                            Compete on leaderboard
                                        </div>
                                    </div>
                                </div>
                                <button class="modal-button" style="background: linear-gradient(135deg, #4a90e2, #50e3c2); border: none; width: 100%; padding: 0.75rem; font-weight: 600; margin-top: auto;">
                                    Sign Up Now
                                </button>
                            </div>
                        </div>

                        <p style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 1rem;">
                            You can always sign up later to start earning rewards!
                        </p>
                    </div>
                `;
            }
        },
        social: {
            title: 'Social',
            content: `
                <div class="social-links" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; padding-top: 0.5rem;">
                    ${createSocialLink('discord', 'fab fa-discord', '#7289da', 'Join our Discord Server')}
                    ${createSocialLink('telegram', 'fab fa-telegram', '#0088cc', 'Telegram Community')}
                    ${createSocialLink('x', 'fa-brands fa-x-twitter', 'white', 'Follow on X')}
                    ${createSocialLink('youtube', 'fab fa-youtube', '#ff0000', 'YouTube Channel')}
                </div>
            `
        },
        support: {
            title: 'Support Center',
            useGrid: true,
            items: [
                { icon: 'fas fa-book', title: 'Game Guide', desc: 'Browse comprehensive guides and tutorials' },
                { icon: 'fas fa-question-circle', title: 'FAQ', desc: 'Find answers to frequently asked questions' },
                { icon: 'fab fa-discord', title: 'Community', desc: 'Get help from our amazing player community' },
                { icon: 'fas fa-bug', title: 'Report Bug', desc: 'Help us improve by reporting issues' }
            ]
        },
        leaders: {
            title: 'Leaderboard',
            dynamic: true,
            getContent: function() {
                return `
                    <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0; flex-wrap: wrap; justify-content: center;">
                        <button class="tab-btn active" data-period="all" style="padding: 0.5rem 1rem; background: var(--primary-green); color: white; border: none; border-radius: 20px; cursor: pointer; flex: 1; min-width: 80px;">All Time</button>
                        <button class="tab-btn" data-period="today" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer; flex: 1; min-width: 80px;">Today</button>
                        <button class="tab-btn" data-period="week" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer; flex: 1; min-width: 80px;">This Week</button>
                    </div>
                    <div id="leaderboard-entries" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading leaderboard...</div>
                    </div>
                `;
            }
        },
        profile: {
            title: 'Player Profile',
            dynamic: true, // This will be generated dynamically
            getContent: function() {
                // Check if user is authenticated
                const isAuthenticated = window.PrivyAuth && window.PrivyAuth.isAuthenticated();
                const user = isAuthenticated ? window.PrivyAuth.getUser() : null;

                if (isAuthenticated && user) {
                    // Authenticated user content with avatar, name, and real stats
                    const displayName = user.username || user.name || 'Player';
                    const provider = user.provider || 'email';
                    const avatarUrl = user.avatar || null; // Will be available from Google/Discord

                    // Use real stats from database if available, otherwise use defaults
                    const stats = user.stats || {
                        gamesPlayed: 0,
                        highScore: 0,
                        totalMassEaten: 0,
                        totalPlayersEaten: 0,
                        totalTimePlayed: 0,
                        rank: null
                    };

                    // Calculate win rate (placeholder for now)
                    const winRate = stats.gamesPlayed > 0 ?
                        ((stats.totalPlayersEaten / Math.max(1, stats.gamesPlayed * 2)) * 100).toFixed(1) :
                        '0.0';

                    return `
                        <div class="profile-header" style="padding: 1.5rem; background: linear-gradient(135deg, rgba(74, 144, 226, 0.15), rgba(80, 227, 194, 0.1)); border-radius: 12px; margin: 1rem 0; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); flex-wrap: wrap;">
                            <div class="profile-avatar" style="width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.8rem; color: white; position: relative; box-shadow: 0 4px 8px rgba(74, 144, 226, 0.3); flex-shrink: 0;">
                                ${avatarUrl ?
                                    `<img src="${avatarUrl}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                    `<i class="fas fa-user"></i>`
                                }
                                <div style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                                    <i class="fa-brands fa-${provider === 'google_oauth' || provider === 'google' ? 'google' : provider === 'discord' ? 'discord' : provider === 'twitter' ? 'twitter' : 'envelope'}" style="font-size: 14px; color: ${provider === 'google_oauth' || provider === 'google' ? '#4285F4' : provider === 'discord' ? '#5865F2' : provider === 'twitter' ? '#1DA1F2' : '#4a90e2'};"></i>
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <div id="username-container" style="display: flex; align-items: center; gap: 0.75rem;">
                                    <h2 id="display-username" style="margin: 0; font-size: 1.5rem; color: white; font-weight: 600;">${displayName}</h2>
                                    <button id="edit-username-btn" onclick="window.toggleUsernameEdit(true)" style="background: rgba(255, 255, 255, 0.1); border: none; color: #50e3c2; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.25rem;">
                                        <i class="fas fa-pencil-alt" style="font-size: 0.75rem;"></i>
                                        Edit
                                    </button>
                                </div>
                                <div id="username-edit-container" style="display: none; align-items: center; gap: 0.5rem;">
                                    <input id="username-input" type="text" value="${displayName}" maxlength="25" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(80, 227, 194, 0.5); color: white; padding: 0.5rem; border-radius: 6px; font-size: 1rem; flex: 1; min-width: 120px; outline: none;">
                                    <button onclick="window.saveUsername()" style="background: #50e3c2; border: none; color: #1a1a1a; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">Save</button>
                                    <button onclick="window.toggleUsernameEdit(false)" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Cancel</button>
                                </div>
                                <div id="username-error" style="display: none; color: #ff6b6b; font-size: 0.85rem; margin-top: 0.5rem;"></div>
                                <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                                    ${stats.rank ?
                                        `<div style="display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 20px;">
                                            <i class="fas fa-trophy" style="font-size: 0.75rem; margin-right: 0.35rem; color: white;"></i>
                                            <span style="font-size: 0.85rem; font-weight: 600; color: white;">Rank #${stats.rank}</span>
                                        </div>` :
                                        `<div style="display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; background: rgba(255, 255, 255, 0.1); border-radius: 20px;">
                                            <span style="font-size: 0.85rem; color: var(--text-secondary);">Unranked</span>
                                        </div>`
                                    }
                                    <div style="display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; background: rgba(255, 255, 255, 0.1); border-radius: 20px;">
                                        <i class="fas fa-gamepad" style="font-size: 0.75rem; margin-right: 0.35rem; color: var(--text-secondary);"></i>
                                        <span style="font-size: 0.85rem; color: var(--text-secondary);">${stats.gamesPlayed || 0} games</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Wallet Balance Section -->
                        <div class="wallet-section" style="margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(46, 125, 50, 0.1)); border-radius: 12px; border: 1px solid rgba(76, 175, 80, 0.2);">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #4CAF50, #2E7D32); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-wallet" style="color: white; font-size: 1.2rem;"></i>
                                    </div>
                                    <div>
                                        <h3 style="color: #4CAF50; font-size: 1.1rem; margin: 0; font-weight: 600;">Wallet Balance</h3>
                                        <div id="wallet-balance" style="font-size: 1.8rem; font-weight: bold; color: #4CAF50; margin: 0.25rem 0;">Loading...</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Virtual Currency</div>
                                    <div>
                                        <button id="add-funds-btn" onclick="window.checkAndAddFunds()" style="background: #4CAF50; border: none; color: white; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;">Add Funds</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="margin: 1.5rem 0;">
                            <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">
                                <i class="fas fa-chart-line" style="margin-right: 0.5rem;"></i>Performance Stats
                            </h3>
                            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                                <div style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1)); border-radius: 12px; padding: 1.25rem; text-align: center; transition: transform 0.2s;">
                                    <i class="fas fa-crown" style="color: #4CAF50; font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
                                    <div style="font-size: 1.75rem; font-weight: bold; color: #4CAF50; line-height: 1;">${(stats.highScore || 0).toLocaleString()}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase;">Best Score</div>
                                </div>
                                <div style="background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1)); border-radius: 12px; padding: 1.25rem; text-align: center; transition: transform 0.2s;">
                                    <i class="fas fa-crosshairs" style="color: #2196F3; font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
                                    <div style="font-size: 1.75rem; font-weight: bold; color: #2196F3; line-height: 1;">${stats.totalPlayersEaten || 0}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase;">Players Eaten</div>
                                </div>
                                <div style="background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.1)); border-radius: 12px; padding: 1.25rem; text-align: center; transition: transform 0.2s;">
                                    <i class="fas fa-cookie-bite" style="color: #FF9800; font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
                                    <div style="font-size: 1.75rem; font-weight: bold; color: #FF9800; line-height: 1;">${Math.floor((stats.totalMassEaten || 0) / 1000)}K</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase;">Mass Eaten</div>
                                </div>
                                <div style="background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.1)); border-radius: 12px; padding: 1.25rem; text-align: center; transition: transform 0.2s;">
                                    <i class="fas fa-clock" style="color: #9C27B0; font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
                                    <div style="font-size: 1.75rem; font-weight: bold; color: #9C27B0; line-height: 1;">${Math.floor((stats.totalTimePlayed || 0) / 60)}h</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase;">Play Time</div>
                                </div>
                            </div>
                        </div>

                        <!-- Preferences Section for Logged-in Users -->
                        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">
                                <i class="fas fa-sliders-h" style="margin-right: 0.5rem;"></i>Game Settings
                            </h3>
                            <div id="preferencesSection" class="preferences-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s; hover: background: rgba(255, 255, 255, 0.08);">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-moon" style="margin-right: 0.5rem; color: #FFC107;"></i>Dark Mode</span>
                                    <input type="checkbox" id="pref-darkMode" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-weight-hanging" style="margin-right: 0.5rem; color: #4CAF50;"></i>Show Mass</span>
                                    <input type="checkbox" id="pref-showMass" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-border-all" style="margin-right: 0.5rem; color: #2196F3;"></i>Show Border</span>
                                    <input type="checkbox" id="pref-showBorder" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-tachometer-alt" style="margin-right: 0.5rem; color: #FF5722;"></i>Show FPS</span>
                                    <input type="checkbox" id="pref-showFps" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-th" style="margin-right: 0.5rem; color: #9C27B0;"></i>Show Grid</span>
                                    <input type="checkbox" id="pref-showGrid" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-infinity" style="margin-right: 0.5rem; color: #00BCD4;"></i>Continuity</span>
                                    <input type="checkbox" id="pref-continuity" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-volume-up" style="margin-right: 0.5rem; color: #E91E63;"></i>Sound Effects</span>
                                    <input type="checkbox" id="pref-soundEnabled" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                    <span style="display: flex; align-items: center; font-size: 0.9rem;"><i class="fas fa-music" style="margin-right: 0.5rem; color: #3F51B5;"></i>Background Music</span>
                                    <input type="checkbox" id="pref-musicEnabled" class="pref-toggle" style="width: 20px; height: 20px; cursor: pointer;">
                                </label>
                            </div>
                            <div id="prefSaveStatus" style="margin-top: 1rem; padding: 0.75rem; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                                <i class="fas fa-info-circle" style="color: var(--primary-green); margin-right: 0.5rem;"></i>
                                <span id="prefStatusText">Preferences are automatically saved and will be applied when you start the game.</span>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 2rem;">
                            <button class="modal-button logout-btn" style="padding: 0.75rem 2rem; font-size: 1rem; background: rgba(244, 67, 54, 0.8); border: none;">
                                <i class="fas fa-sign-out-alt" style="margin-right: 0.5rem;"></i>
                                Sign Out
                            </button>
                        </div>
                    `;
                } else {
                    // Guest user content - Get the current guest name
                    const playerNameInput = document.getElementById('playerNameInput');
                    const guestName = playerNameInput && playerNameInput.value ? playerNameInput.value : 'Guest_' + Math.floor(Math.random() * 10000);

                    return `
                        <div style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 10px; margin: 1.5rem 0; display: flex; align-items: center; gap: 1.5rem;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #6c757d, #495057); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">
                                <i class="fas fa-user-secret"></i>
                            </div>
                            <div>
                                <h3 style="margin-bottom: 0.25rem;">${guestName}</h3>
                                <p style="color: var(--text-secondary); font-size: 0.9rem;">Guest Player</p>
                            </div>
                        </div>

                        <div style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(80, 227, 194, 0.1)); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 10px; padding: 1.5rem; margin: 2rem 0;">
                            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                                <i class="fas fa-lightbulb" style="font-size: 1.8rem; color: #50e3c2; flex-shrink: 0; margin-top: 0.2rem;"></i>
                                <div>
                                    <h4 style="color: #fff; margin-bottom: 0.5rem; font-size: 1.1rem;">Pro Tip: Unlock Exclusive Rewards</h4>
                                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">Sign in to save your stats and climb the global leaderboard!</p>
                                </div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 2rem;">
                            <button class="modal-button auth-trigger-btn" style="padding: 1rem 2.5rem; font-size: 1.1rem; background: linear-gradient(135deg, #4a90e2, #50e3c2); border: none; font-weight: 600;">
                                <i class="fas fa-sign-in-alt" style="margin-right: 0.5rem;"></i>
                                Sign In / Sign Up
                            </button>
                            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 1rem;">Join thousands of players worldwide!</p>
                        </div>
                    `;
                }
            }
        }
    };

    // Helper functions
    function createSocialLink(platform, iconClass, color, text) {
        const hoverStyle = `onmouseover="this.style.transform='translateY(-5px)'; this.style.background='rgba(255, 255, 255, 0.1)'"`;
        const outStyle = `onmouseout="this.style.transform='translateY(0)'; this.style.background='rgba(59, 130, 246, 0.1)'"`;
        return `
            <a href="#" class="social-link"
               style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);"
               ${hoverStyle} ${outStyle}>
                <i class="${iconClass}" style="font-size: 1.5rem; color: ${color}; width: 40px;"></i>
                <span>${text}</span>
            </a>
        `;
    }

    function createLeaderboardEntry(rank, name, score, medal = '', isCurrentUser = false, isMobile = false) {
        const medalStyles = {
            gold: 'background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border: 1px solid rgba(255, 215, 0, 0.5);',
            silver: 'background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.1)); border: 1px solid rgba(192, 192, 192, 0.5);',
            bronze: 'background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.1)); border: 1px solid rgba(205, 127, 50, 0.5);'
        };

        let style = medal ? medalStyles[medal] : 'background: rgba(255, 255, 255, 0.05);';

        // Add special styling for current user
        if (isCurrentUser) {
            style = medal ? medalStyles[medal] : '';
            style += ' background: linear-gradient(135deg, rgba(74, 144, 226, 0.25), rgba(80, 227, 194, 0.15)); border: 2px solid rgba(80, 227, 194, 0.8); box-shadow: 0 0 15px rgba(80, 227, 194, 0.3);';
        }

        const rankSize = medal ? `font-size: ${1.5 - rank * 0.1}rem;` : '';
        const rankColor = medal ? `color: ${medal === 'gold' ? 'gold' : medal === 'silver' ? 'silver' : '#cd7f32'};` : '';

        return `
            <div style="display: flex; align-items: center; padding: 1rem; ${style} border-radius: 10px; position: relative; transition: all 0.3s ease;">
                ${isCurrentUser ? `
                    <div style="position: absolute; left: -10px; top: 50%; transform: translateY(-50%); width: 4px; height: 70%; background: linear-gradient(180deg, #50e3c2, #4a90e2); border-radius: 2px;"></div>
                ` : ''}
                <span style="font-weight: bold; ${rankSize} ${rankColor} width: 40px; text-align: center;">${rank}</span>
                <span style="flex: 1; margin-left: 1rem; display: flex; align-items: center; gap: 0.5rem; ${isCurrentUser ? 'font-weight: 600; color: #50e3c2;' : ''}">
                    ${isCurrentUser ? `<i class="fas fa-user" style="font-size: 0.9rem;"></i>` : ''}
                    ${name}
                    ${isCurrentUser && !isMobile ? `
                        <span style="background: rgba(80, 227, 194, 0.9); color: white; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">You</span>
                    ` : ''}
                </span>
                <span style="font-weight: bold; color: ${isCurrentUser ? '#50e3c2' : 'var(--primary-green)'};">${score}</span>
            </div>
        `;
    }

    // Fetch and display leaderboard data from API
    async function fetchLeaderboard(period = 'all') {
        try {
            // For now, we'll use the basic leaderboard endpoint
            // In the future, we could add period filtering on the backend
            const response = await fetch('/api/leaderboard?limit=10');

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            displayLeaderboard(data, period);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            displayLeaderboardError();
        }
    }

    function displayLeaderboard(data, period) {
        const container = document.getElementById('leaderboard-entries');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-users" style="font-size: 3rem; opacity: 0.5; margin-bottom: 1rem;"></i>
                    <p>No players on the leaderboard yet.</p>
                    <p style="font-size: 0.9rem;">Be the first to make it!</p>
                </div>
            `;
            return;
        }

        // Get current user's username to highlight their entry
        const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
        const currentUsername = userData?.username || null;

        // Display the leaderboard entries
        const entries = data.map((player, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const score = player.highest_mass || 0;
            const gamesPlayed = player.games_played || 0;
            const username = player.username || 'Anonymous';
            const isCurrentUser = currentUsername && username === currentUsername;

            // Format score with commas
            const formattedScore = score.toLocaleString();

            // Detect mobile by device capabilities, not screen width
            // This ensures proper detection even in landscape mode
            const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
            return createLeaderboardEntry(rank, username, formattedScore, medal, isCurrentUser, isMobile);
        }).join('');

        container.innerHTML = entries;
    }

    function displayLeaderboardError() {
        const container = document.getElementById('leaderboard-entries');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; opacity: 0.5; margin-bottom: 1rem;"></i>
                <p>Unable to load leaderboard.</p>
                <button onclick="window.fetchLeaderboard()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-green); color: white; border: none; border-radius: 20px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }

    // Setup leaderboard tab switching
    function setupLeaderboardTabs() {
        // Attach event listeners for tab switching after modal content is loaded
        setTimeout(() => {
            const tabs = document.querySelectorAll('.tab-btn[data-period]');
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Play click sound for leaderboard tabs
                    playClickSound();

                    // Update active tab styling
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.background = 'transparent';
                        t.style.color = 'var(--text-secondary)';
                        t.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                    });

                    this.classList.add('active');
                    this.style.background = 'var(--primary-green)';
                    this.style.color = 'white';
                    this.style.border = 'none';

                    // Fetch leaderboard for selected period
                    const period = this.dataset.period;
                    fetchLeaderboard(period);
                });
            });
        }, 100);
    }

    // Make fetchLeaderboard available globally for retry button
    window.fetchLeaderboard = fetchLeaderboard;

    // Play choice functions - global scope for inline onclick handlers
    window.playAsGuest = function() {
        playMenuSelectionSound();

        // Close the play choice modal
        const modal = document.getElementById('sectionModal');
        if (modal) closeModal(modal);

        // Start the game immediately as guest
        redirectToGame();
    };

    window.signUpToPlay = function() {
        playClickSound();

        // Close the play choice modal
        const modal = document.getElementById('sectionModal');
        if (modal) closeModal(modal);

        // Set a flag to indicate user wants to play after signing up
        window._playAfterAuth = true;

        // Trigger authentication flow
        window.dispatchEvent(new CustomEvent('auth:show-privy'));
    };

    function showPlayChoiceModal() {
        const template = modalTemplates.playChoice;
        let modal = document.getElementById('sectionModal');
        if (!modal) {
            modal = createModal('sectionModal', '<div id="modalContent"></div>');
        }

        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <h2>${template.title}</h2>
            ${template.getContent()}
        `;

        showModal('sectionModal');
    }

    function redirectToGame() {
        // Set the username for logged-in users
        const playerNameInput = document.getElementById("playerNameInput");
        if (playerNameInput) {
            // Check if user is logged in
            const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
            if (userData && userData.username) {
                // Use the logged-in user's username
                playerNameInput.value = userData.username;
            } else if (!playerNameInput.value) {
                // Only set guest name if not logged in and no name entered
                playerNameInput.value = "Guest_" + Math.floor(Math.random() * 10000);
            }
        }

        // Instead of redirecting, trigger seamless game start
        if (typeof window.startSeamlessGame === 'function') {
            window.startSeamlessGame();
        } else {
            // Fallback: manually start the game

            // Hide landing view and show game view
            const landingView = document.getElementById("landingView");
            const gameView = document.getElementById("gameView");

            if (landingView && gameView) {
                landingView.style.display = "none";
                gameView.style.display = "block";
                setTimeout(() => {
                    const gameArea = document.getElementById("gameAreaWrapper");
                    if (gameArea) gameArea.style.opacity = 1;
                }, 50);
            }

            // Initialize game if startGame function is available
            if (typeof window.startGame === 'function') {
                window.startGame("player");
            }
        }
    }

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    function closeModal(modal) {
        modal.classList.remove('show');
        elements.navItems.forEach(nav => nav.classList.remove('active'));
    }

    function createModal(id, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                ${content}
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });

        return modal;
    }

    // Event listeners
    elements.playBtn?.addEventListener('click', () => {
        playMenuSelectionSound(); // Play menu selection sound for Play button

        // Check if user is authenticated
        const isAuthenticated = window.PrivyAuth && window.PrivyAuth.isAuthenticated();

        if (isAuthenticated) {
            // User is logged in, go directly to game
            redirectToGame();
        } else {
            // User is not logged in, show the play choice modal
            showPlayChoiceModal();
        }
    });
    elements.howToPlayBtn?.addEventListener('click', () => {
        playClickSound(); // Play click sound for How to Play button
        showModal('tutorialModal');
    });
    elements.startFromTutorial?.addEventListener('click', () => {
        playMenuSelectionSound(); // Play menu selection sound for Got It! Let's Play button
        // Close the tutorial modal first
        if (elements.tutorialModal) {
            closeModal(elements.tutorialModal);
        }
        // Then redirect to game
        redirectToGame();
    });

    // Game settings button - handle both click and touch
    const gameSettingsBtn = document.getElementById('gameSettingsBtn');
    if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showModal('settingsModal');
        });
        gameSettingsBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showModal('settingsModal');
        });
    }

    // Settings modal close button
    const closeSettingsBtn = document.querySelector('.close-settings');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) closeModal(settingsModal);
        });
    }

    // Add close button functionality to existing modals
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Navigation items
    elements.navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;

            // Play menu selection sound for main nav buttons
            playMenuSelectionSound();

            // Update active state
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // For profile section, always show the profile modal
            // The modal content will be different based on auth status
            // (No special handling needed - let it fall through to show modal)

            // Show modal content
            const template = modalTemplates[section];
            if (!template) return;

            let modal = document.getElementById('sectionModal');
            if (!modal) {
                modal = createModal('sectionModal', '<div id="modalContent"></div>');
            }

            const modalContent = document.getElementById('modalContent');
            if (template.useGrid) {
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    <div class="tutorial-content">
                        ${template.items.map(item => `
                            <div class="tutorial-step">
                                <i class="${item.icon}"></i>
                                <h3>${item.title}</h3>
                                <p>${item.desc}</p>
                            </div>
                        `).join('')}
                    </div>
                    <button class="modal-button" onclick="playClickSound(); this.closest('.modal').classList.remove('show')">Close</button>
                `;
            } else if (template.dynamic && template.getContent) {
                // Handle dynamic content (like profile and leaderboard)
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    ${template.getContent()}
                `;

                // If this is the leaderboard section, fetch the data
                if (section === 'leaders') {
                    fetchLeaderboard('all');
                    setupLeaderboardTabs();
                }

                // If this is the profile section, load wallet balance
                if (section === 'profile') {
                    // Small delay to ensure DOM is ready
                    setTimeout(() => {
                        if (window.loadWalletBalance) {
                            window.loadWalletBalance();
                        }
                    }, 100);
                }
            } else {
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    ${template.content}
                `;
            }

            showModal('sectionModal');

            // Add event listeners for auth and logout buttons if they exist
            setTimeout(() => {
                const authBtn = document.querySelector('.auth-trigger-btn');
                if (authBtn) {
                    authBtn.addEventListener('click', (e) => {
                        playClickSound(); // Play click sound for sign in button
                        e.preventDefault();
                        e.stopPropagation();
                        closeModal(modal);
                        window.dispatchEvent(new CustomEvent('auth:show-privy'));
                    });
                }

                const logoutBtn = document.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        playClickSound(); // Play click sound for logout button
                        // Trigger logout through Privy
                        if (window.PrivyAuth && typeof window.PrivyAuth.logout === 'function') {
                            // Use Privy's logout if available
                            window.dispatchEvent(new CustomEvent('auth:trigger-logout'));
                        } else {
                            // Fallback: clear localStorage and update UI
                            localStorage.removeItem('privy_user');
                            window.dispatchEvent(new CustomEvent('auth:logout'));
                        }

                        // Close the modal
                        closeModal(modal);

                        // Update the nav items to remove active state
                        elements.navItems.forEach(nav => nav.classList.remove('active'));
                    });
                }

                // Handle social links clicks
                const socialLinks = document.querySelectorAll('.social-link');
                socialLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        playClickSound(); // Play click sound for social buttons
                        console.log('Social button clicked:', e.currentTarget);
                    });
                });

                // Handle support center buttons clicks
                const tutorialSteps = document.querySelectorAll('.tutorial-step');
                tutorialSteps.forEach(step => {
                    step.addEventListener('click', () => {
                        playClickSound(); // Play click sound for support center buttons
                        console.log('Support center button clicked:', step);
                    });
                });

                // Handle edit name button click
                const editBtn = document.querySelector('.edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        playClickSound(); // Play click sound for edit name button
                    });
                }


                // Handle preferences toggles if user is authenticated
                const prefToggles = document.querySelectorAll('.pref-toggle');
                if (prefToggles.length > 0) {
                    // Add click sound to all preference toggles
                    prefToggles.forEach(toggle => {
                        toggle.addEventListener('change', () => {
                            playClickSound(); // Play click sound for preference toggles
                        });
                    });
                    // Load current preferences from server
                    const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
                    if (userData && userData.dbUserId) {
                        // Use the correct API URL
                        const apiBase = '';

                        // Fetch current preferences
                        fetch(`${apiBase}/api/user/${userData.dbUserId}/preferences`)
                            .then(response => {
                                if (!response.ok) throw new Error('Failed to load preferences');
                                return response.json();
                            })
                            .then(prefs => {
                                console.log('Loaded preferences from server:', prefs);
                                // Set checkbox states based on server preferences
                                const darkModeEl = document.getElementById('pref-darkMode');
                                const showMassEl = document.getElementById('pref-showMass');
                                const showBorderEl = document.getElementById('pref-showBorder');
                                const showFpsEl = document.getElementById('pref-showFps');
                                const showGridEl = document.getElementById('pref-showGrid');
                                const continuityEl = document.getElementById('pref-continuity');
                                const soundEnabledEl = document.getElementById('pref-soundEnabled');
                                const musicEnabledEl = document.getElementById('pref-musicEnabled');

                                if (darkModeEl) darkModeEl.checked = prefs.darkMode === true;
                                if (showMassEl) showMassEl.checked = prefs.showMass === true;
                                if (showBorderEl) showBorderEl.checked = prefs.showBorder === true;
                                if (showFpsEl) showFpsEl.checked = prefs.showFps === true;
                                if (showGridEl) showGridEl.checked = prefs.showGrid === true;
                                if (continuityEl) continuityEl.checked = prefs.continuity === true;
                                if (soundEnabledEl) soundEnabledEl.checked = prefs.soundEnabled === true;
                                if (musicEnabledEl) musicEnabledEl.checked = prefs.musicEnabled === true;
                            })
                            .catch(error => {
                                console.warn('Failed to load preferences, using defaults:', error);
                                // Set default values from game config
                                const defaults = window.DEFAULT_PREFERENCES || {};
                                const darkModeEl = document.getElementById('pref-darkMode');
                                const showMassEl = document.getElementById('pref-showMass');
                                const showBorderEl = document.getElementById('pref-showBorder');
                                const showFpsEl = document.getElementById('pref-showFps');
                                const showGridEl = document.getElementById('pref-showGrid');
                                const continuityEl = document.getElementById('pref-continuity');
                                const soundEnabledEl = document.getElementById('pref-soundEnabled');
                                const musicEnabledEl = document.getElementById('pref-musicEnabled');

                                if (darkModeEl) darkModeEl.checked = defaults.darkMode !== false;
                                if (showMassEl) showMassEl.checked = defaults.showMass !== false;
                                if (showBorderEl) showBorderEl.checked = defaults.showBorder !== false;
                                if (showFpsEl) showFpsEl.checked = defaults.showFps === true;
                                if (showGridEl) showGridEl.checked = defaults.showGrid !== false;
                                if (continuityEl) continuityEl.checked = defaults.continuity !== false;
                                if (soundEnabledEl) soundEnabledEl.checked = defaults.soundEnabled === true;
                                if (musicEnabledEl) musicEnabledEl.checked = defaults.musicEnabled === true;
                            });

                        // Add change listeners to save preferences
                        prefToggles.forEach(toggle => {
                            toggle.addEventListener('change', function() {
                                const prefName = this.id.replace('pref-', '');
                                const value = this.checked ? 1 : 0;

                                // Map frontend names to database column names
                                const prefMap = {
                                    'darkMode': 'dark_mode',
                                    'showMass': 'show_mass',
                                    'showBorder': 'show_border',
                                    'showFps': 'show_fps',
                                    'showGrid': 'show_grid',
                                    'continuity': 'continuity',
                                    'soundEnabled': 'sound_enabled',
                                    'musicEnabled': 'music_enabled'
                                };

                                const dbPrefName = prefMap[prefName];
                                if (!dbPrefName) return;

                                // Show saving status
                                const statusEl = document.getElementById('prefStatusText');
                                if (statusEl) {
                                    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>Saving...';
                                }

                                // Get the correct API URL again
                                const saveApiBase = '';

                                // Save preference to server
                                const preferences = {};
                                preferences[dbPrefName] = value;

                                fetch(`${saveApiBase}/api/user/${userData.dbUserId}/preferences`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(preferences)
                                })
                                .then(response => {
                                    if (!response.ok) throw new Error('Failed to save preference');
                                    console.log(`Preference ${dbPrefName} saved:`, value);

                                    // Show success status
                                    if (statusEl) {
                                        statusEl.innerHTML = '<i class="fas fa-check" style="color: var(--primary-green); margin-right: 0.5rem;"></i>Saved! Preferences will be applied when you start the game.';
                                        setTimeout(() => {
                                            statusEl.innerHTML = 'Preferences are automatically saved and will be applied when you start the game.';
                                        }, 2000);
                                    }
                                })
                                .catch(error => {
                                    console.error('Failed to save preference:', error);
                                    // Revert the checkbox
                                    this.checked = !this.checked;

                                    // Show error status
                                    if (statusEl) {
                                        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f44336; margin-right: 0.5rem;"></i>Failed to save. Please try again.';
                                        setTimeout(() => {
                                            statusEl.innerHTML = 'Preferences are automatically saved and will be applied when you start the game.';
                                        }, 3000);
                                    }
                                });
                            });
                        });
                    }
                }
            }, 100);
        });
    });

    // Username editing functions
    window.toggleUsernameEdit = function(show) {
        const displayContainer = document.getElementById('username-container');
        const editContainer = document.getElementById('username-edit-container');
        const errorDiv = document.getElementById('username-error');

        if (show) {
            displayContainer.style.display = 'none';
            editContainer.style.display = 'flex';
            document.getElementById('username-input').focus();
            document.getElementById('username-input').select();
        } else {
            displayContainer.style.display = 'flex';
            editContainer.style.display = 'none';
            errorDiv.style.display = 'none';
            // Reset input value to current username
            const currentUsername = document.getElementById('display-username').textContent;
            document.getElementById('username-input').value = currentUsername;
        }
    };

    window.saveUsername = async function() {
        const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
        if (!userData || !userData.dbUserId) {
            console.error('No user data found');
            return;
        }

        const newUsername = document.getElementById('username-input').value.trim();
        const errorDiv = document.getElementById('username-error');

        // Validate username
        if (!newUsername) {
            errorDiv.textContent = 'Username cannot be empty';
            errorDiv.style.display = 'block';
            return;
        }

        if (newUsername.length > 25) {
            errorDiv.textContent = 'Username must be 25 characters or less';
            errorDiv.style.display = 'block';
            return;
        }

        // Basic validation for allowed characters
        const usernameRegex = /^[\w\s.\-]{1,25}$/;
        if (!usernameRegex.test(newUsername)) {
            errorDiv.textContent = 'Username can only contain letters, numbers, spaces, dots, and hyphens';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            // Show saving state
            const saveBtn = document.querySelector('#username-edit-container button[onclick="window.saveUsername()"]');
            if (saveBtn) {
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;
            }

            // Get the correct API URL
            const apiBase = '';

            // Check username availability (excluding current user)
            const availabilityResponse = await fetch(`${apiBase}/api/username/available/${encodeURIComponent(newUsername)}?userId=${userData.dbUserId}`);
            const availabilityData = await availabilityResponse.json();

            if (!availabilityData.available) {
                errorDiv.textContent = 'This username is already taken';
                errorDiv.style.display = 'block';
                if (saveBtn) {
                    saveBtn.textContent = 'Save';
                    saveBtn.disabled = false;
                }
                return;
            }

            // Update username on server
            const response = await fetch(`${apiBase}/api/user/${userData.dbUserId}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: newUsername })
            });

            if (!response.ok) {
                throw new Error('Failed to update username');
            }

            const result = await response.json();

            // Update localStorage
            userData.username = newUsername;
            localStorage.setItem('privy_user', JSON.stringify(userData));

            // Update display
            document.getElementById('display-username').textContent = newUsername;

            // Update player name input if it exists
            const playerNameInput = document.getElementById('playerNameInput');
            if (playerNameInput) {
                playerNameInput.value = newUsername;
            }

            // Close edit mode
            window.toggleUsernameEdit(false);

            // Show success message
            errorDiv.textContent = 'Username updated successfully!';
            errorDiv.style.color = '#50e3c2';
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.color = '#ff6b6b';
            }, 3000);

        } catch (error) {
            console.error('Error saving username:', error);
            errorDiv.textContent = 'Failed to save username. Please try again.';
            errorDiv.style.display = 'block';
        } finally {
            // Reset button state
            const saveBtn = document.querySelector('#username-edit-container button[onclick="window.saveUsername()"]');
            if (saveBtn) {
                saveBtn.textContent = 'Save';
                saveBtn.disabled = false;
            }
        }
    };

    // Wallet Balance Functions
    window.loadWalletBalance = async function() {
        const walletElement = document.getElementById('wallet-balance');
        if (!walletElement) {
            console.warn('Wallet balance element not found');
            return;
        }

        const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
        if (!userData.dbUserId) {
            walletElement.textContent = '$0.00';
            window.updateAddFundsButton(0);
            return;
        }

        try {
            const apiBase = window.location.port === '8080' ? `${window.location.protocol}//${window.location.hostname}:3000` : '';
            const response = await fetch(`${apiBase}/api/user/${userData.dbUserId}/wallet`);

            if (!response.ok) {
                throw new Error('Failed to fetch wallet balance');
            }

            const walletData = await response.json();
            const balance = parseFloat(walletData.balance);

            // Update the balance display with animation (rounded to 2 decimals for display)
            const balanceElement = document.getElementById('wallet-balance');
            if (balanceElement) {
                balanceElement.style.opacity = '0.5';
                setTimeout(() => {
                    balanceElement.textContent = `$${balance.toFixed(2)}`;
                    balanceElement.style.opacity = '1';
                }, 200);
            }

            // Update Add Funds button state
            window.updateAddFundsButton(balance);

        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            if (walletElement) {
                walletElement.textContent = 'Error';
            }
            window.updateAddFundsButton(0);
        }
    };

    // Update Add Funds button state based on balance
    window.updateAddFundsButton = function(balance) {
        const addFundsBtn = document.getElementById('add-funds-btn');
        if (!addFundsBtn) return;

        if (balance < 1.0) {
            // Enable button when balance is below $1
            addFundsBtn.disabled = false;
            addFundsBtn.style.background = '#4CAF50';
            addFundsBtn.style.cursor = 'pointer';
            addFundsBtn.style.opacity = '1';
            addFundsBtn.textContent = 'Add $1.00';
        } else {
            // Disable button when balance is $1 or more
            addFundsBtn.disabled = true;
            addFundsBtn.style.background = '#666';
            addFundsBtn.style.cursor = 'not-allowed';
            addFundsBtn.style.opacity = '0.5';
            addFundsBtn.textContent = 'Reload Not Available';
        }
    };

    // Check balance and add funds if needed
    window.checkAndAddFunds = async function() {
        const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
        if (!userData.dbUserId) {
            console.error('No user ID found');
            return;
        }

        // Get current balance first
        try {
            const apiBase = window.location.port === '8080' ? `${window.location.protocol}//${window.location.hostname}:3000` : '';
            const balanceResponse = await fetch(`${apiBase}/api/user/${userData.dbUserId}/wallet`);

            if (!balanceResponse.ok) {
                throw new Error('Failed to fetch current balance');
            }

            const walletData = await balanceResponse.json();
            const currentBalance = parseFloat(walletData.balance);

            // Only add funds if balance is below $1.00
            if (currentBalance >= 1.0) {
                // Show message that balance is already sufficient
                const infoMsg = document.createElement('div');
                infoMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #2196F3; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3); z-index: 10000; font-weight: 600;';
                infoMsg.innerHTML = `<i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>Your wallet is already at the maximum balance of $1.00`;
                document.body.appendChild(infoMsg);

                setTimeout(() => {
                    infoMsg.remove();
                }, 3000);
                return;
            }

            // Calculate how much to add to reach exactly $1.00
            const amountToAdd = 1.0 - currentBalance;

            // Add funds to reach exactly $1.00
            const addResponse = await fetch(`${apiBase}/api/user/${userData.dbUserId}/wallet/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amountToAdd,
                    description: `Refilled wallet to $1.00 (added $${amountToAdd.toFixed(6)})`
                })
            });

            if (!addResponse.ok) {
                throw new Error('Failed to add funds');
            }

            // Refresh wallet balance
            await window.loadWalletBalance();

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3); z-index: 10000; font-weight: 600;';
            successMsg.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>Wallet refilled to $1.00!`;
            document.body.appendChild(successMsg);

            setTimeout(() => {
                successMsg.remove();
            }, 3000);

        } catch (error) {
            console.error('Error adding funds:', error);

            // Show error message
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3); z-index: 10000; font-weight: 600;';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 0.5rem;"></i>Failed to add funds. Please try again.`;
            document.body.appendChild(errorMsg);

            setTimeout(() => {
                errorMsg.remove();
            }, 3000);
        }
    };

    window.showAddFundsModal = function() {
        // Show a modal for adding funds (placeholder for now)
        const modal = document.querySelector('.modal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <h2>Add Funds</h2>
            <div style="padding: 1rem 0;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Add virtual currency to your wallet for in-game purchases and features.</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin: 1.5rem 0;">
                    <button onclick="window.addFunds(1)" style="background: linear-gradient(135deg, #4CAF50, #2E7D32); border: none; color: white; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <div style="font-size: 1.2rem;">$1.00</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">Starter</div>
                    </button>
                    <button onclick="window.addFunds(5)" style="background: linear-gradient(135deg, #2196F3, #1565C0); border: none; color: white; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <div style="font-size: 1.2rem;">$5.00</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">Popular</div>
                    </button>
                    <button onclick="window.addFunds(10)" style="background: linear-gradient(135deg, #FF9800, #F57C00); border: none; color: white; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <div style="font-size: 1.2rem;">$10.00</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">Best Value</div>
                    </button>
                    <button onclick="window.addFunds(25)" style="background: linear-gradient(135deg, #9C27B0, #6A1B9A); border: none; color: white; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <div style="font-size: 1.2rem;">$25.00</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">Premium</div>
                    </button>
                </div>

                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                    <p style="color: #FFC107; margin: 0; font-size: 0.85rem; text-align: center;">
                        <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
                        This is virtual currency for demonstration purposes only.
                    </p>
                </div>
            </div>
            <button class="modal-button" onclick="playClickSound(); this.closest('.modal').classList.remove('show')">Close</button>
        `;

        modal.classList.add('show');
        playMenuSelectionSound();
    };

    window.addFunds = async function(amount) {
        const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
        if (!userData.dbUserId) {
            console.error('No user ID found');
            return;
        }

        try {
            const apiBase = window.location.port === '8080' ? `${window.location.protocol}//${window.location.hostname}:3000` : '';
            const response = await fetch(`${apiBase}/api/user/${userData.dbUserId}/wallet/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    description: `Added $${amount} via Add Funds`
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add funds');
            }

            const result = await response.json();

            // Close the modal
            document.querySelector('.modal').classList.remove('show');

            // Refresh wallet balance
            await window.loadWalletBalance();

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3); z-index: 10000; font-weight: 600;';
            successMsg.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>Successfully added $${amount.toFixed(6)} to your wallet!`;
            document.body.appendChild(successMsg);

            setTimeout(() => {
                successMsg.remove();
            }, 3000);

        } catch (error) {
            console.error('Error adding funds:', error);
            alert('Failed to add funds. Please try again.');
        }
    };


    // Listen for successful authentication to auto-redirect to game if user signed up to play
    window.addEventListener('auth:login', function(event) {
        // Check if user came from the "Sign Up & Compete" choice
        if (window._playAfterAuth) {
            window._playAfterAuth = false; // Clear the flag

            // Small delay to ensure everything is loaded
            setTimeout(() => {
                redirectToGame();
            }, 1500);
        }
    });

    // Initialize Privy authentication
    window.dispatchEvent(new CustomEvent('privy:init'));

    // Initialize hamburger menu for mobile
    initHamburgerMenu();

    // Initialize parallax effect
    initParallax();

    function initParallax() {
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
        });

        function animate() {
            targetX += (mouseX - targetX) * 0.1;
            targetY += (mouseY - targetY) * 0.1;

            const previewCells = document.querySelector('.preview-cells');
            if (previewCells) {
                previewCells.style.transform = `translate(${targetX}px, ${targetY}px)`;
            }
            requestAnimationFrame(animate);
        }
        animate();
    }
});