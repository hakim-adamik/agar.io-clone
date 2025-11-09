// Landing page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const TRANSITION_DELAY = 300;
    const GAME_URL = 'index.html';

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
        social: {
            title: 'Social',
            content: `
                <div class="social-links" style="display: grid; gap: 1rem; margin-top: 1.5rem; padding-top: 0.5rem;">
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
                    <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0;">
                        <button class="tab-btn active" data-period="all" style="padding: 0.5rem 1rem; background: var(--primary-green); color: white; border: none; border-radius: 20px; cursor: pointer;">All Time</button>
                        <button class="tab-btn" data-period="today" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">Today</button>
                        <button class="tab-btn" data-period="week" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">This Week</button>
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
                        <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(74, 144, 226, 0.15), rgba(80, 227, 194, 0.1)); border-radius: 12px; margin: 1rem 0; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <div style="width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.8rem; color: white; position: relative; box-shadow: 0 4px 8px rgba(74, 144, 226, 0.3);">
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
                                    <input id="username-input" type="text" value="${displayName}" maxlength="25" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(80, 227, 194, 0.5); color: white; padding: 0.5rem; border-radius: 6px; font-size: 1rem; width: 200px; outline: none;">
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
                        <div style="margin: 1.5rem 0;">
                            <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">
                                <i class="fas fa-chart-line" style="margin-right: 0.5rem;"></i>Performance Stats
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem;">
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
                            <div id="preferencesSection" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
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

    function createLeaderboardEntry(rank, name, score, medal = '', isCurrentUser = false) {
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
                    ${isCurrentUser ? `
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

            return createLeaderboardEntry(rank, username, formattedScore, medal, isCurrentUser);
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
    elements.playBtn?.addEventListener('click', redirectToGame);
    elements.howToPlayBtn?.addEventListener('click', () => showModal('tutorialModal'));
    elements.startFromTutorial?.addEventListener('click', () => {
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
                    <button class="modal-button" onclick="this.closest('.modal').classList.remove('show')">Close</button>
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
                        e.preventDefault();
                        e.stopPropagation();
                        closeModal(modal);
                        window.dispatchEvent(new CustomEvent('auth:show-privy'));
                    });
                }

                const logoutBtn = document.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
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

                // Handle preferences toggles if user is authenticated
                const prefToggles = document.querySelectorAll('.pref-toggle');
                if (prefToggles.length > 0) {
                    // Load current preferences from server
                    const userData = JSON.parse(localStorage.getItem('privy_user') || '{}');
                    if (userData && userData.dbUserId) {
                        // Use the correct API URL
                        const apiBase = window.location.port === '8080' ? '' : 'http://localhost:8080';

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

                                if (darkModeEl) darkModeEl.checked = prefs.darkMode === true;
                                if (showMassEl) showMassEl.checked = prefs.showMass === true;
                                if (showBorderEl) showBorderEl.checked = prefs.showBorder === true;
                                if (showFpsEl) showFpsEl.checked = prefs.showFps === true;
                                if (showGridEl) showGridEl.checked = prefs.showGrid === true;
                                if (continuityEl) continuityEl.checked = prefs.continuity === true;
                            })
                            .catch(error => {
                                console.warn('Failed to load preferences, using defaults:', error);
                                // Set default values from game config
                                const defaults = window.gameConfig ? window.gameConfig.defaultSettings : {};
                                const darkModeEl = document.getElementById('pref-darkMode');
                                const showMassEl = document.getElementById('pref-showMass');
                                const showBorderEl = document.getElementById('pref-showBorder');
                                const showFpsEl = document.getElementById('pref-showFps');
                                const showGridEl = document.getElementById('pref-showGrid');
                                const continuityEl = document.getElementById('pref-continuity');

                                if (darkModeEl) darkModeEl.checked = defaults.darkMode !== false;
                                if (showMassEl) showMassEl.checked = defaults.showMass !== false;
                                if (showBorderEl) showBorderEl.checked = defaults.showBorder !== false;
                                if (showFpsEl) showFpsEl.checked = defaults.showFps === true;
                                if (showGridEl) showGridEl.checked = defaults.showGrid !== false;
                                if (continuityEl) continuityEl.checked = defaults.continuity !== false;
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
                                    'continuity': 'continuity'
                                };

                                const dbPrefName = prefMap[prefName];
                                if (!dbPrefName) return;

                                // Show saving status
                                const statusEl = document.getElementById('prefStatusText');
                                if (statusEl) {
                                    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>Saving...';
                                }

                                // Get the correct API URL again
                                const saveApiBase = window.location.port === '8080' ? '' : 'http://localhost:8080';

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
            const apiBase = window.location.port === '8080' ? '' : 'http://localhost:8080';

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

    // Initialize Privy authentication
    window.dispatchEvent(new CustomEvent('privy:init'));

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