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
            content: `
                <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0;">
                    ${['Today', 'This Week', 'All Time'].map((period, i) =>
                        `<button class="tab-btn ${i === 0 ? 'active' : ''}" style="padding: 0.5rem 1rem; background: ${i === 0 ? 'var(--primary-green)' : 'transparent'}; color: ${i === 0 ? 'white' : 'var(--text-secondary)'}; border: ${i === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'}; border-radius: 20px; cursor: pointer;">${period}</button>`
                    ).join('')}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${createLeaderboardEntry(1, 'ChampionPlayer', '52,450', 'gold')}
                    ${createLeaderboardEntry(2, 'ProGamer2024', '48,320', 'silver')}
                    ${createLeaderboardEntry(3, 'EliteCells', '45,100', 'bronze')}
                    ${createLeaderboardEntry(4, 'MasterEater', '42,800')}
                    ${createLeaderboardEntry(5, 'CellHunter', '40,550')}
                </div>
            `
        },
        profile: {
            title: 'Player Profile',
            dynamic: true, // This will be generated dynamically
            getContent: function() {
                // Check if user is authenticated
                const isAuthenticated = window.PrivyAuth && window.PrivyAuth.isAuthenticated();
                const user = isAuthenticated ? window.PrivyAuth.getUser() : null;

                if (isAuthenticated && user) {
                    // Authenticated user content with avatar, name, and mocked stats
                    const displayName = user.name || 'Player';
                    const provider = user.provider || 'email';
                    const avatarUrl = user.avatar || null; // Will be available from Google/Discord

                    // Mock player statistics
                    const stats = {
                        gamesPlayed: Math.floor(Math.random() * 150) + 50,
                        highScore: Math.floor(Math.random() * 50000) + 10000,
                        totalMass: Math.floor(Math.random() * 500000) + 100000,
                        winRate: (Math.random() * 40 + 40).toFixed(1), // 40-80%
                        rank: Math.floor(Math.random() * 1000) + 1
                    };

                    return `
                        <div style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 10px; margin: 1.5rem 0; display: flex; align-items: center; gap: 1.5rem;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; position: relative;">
                                ${avatarUrl ?
                                    `<img src="${avatarUrl}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                    `<i class="fas fa-user-check"></i>`
                                }
                                <div style="position: absolute; bottom: -2px; right: -2px; width: 24px; height: 24px; background: #4a90e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
                                    <i class="fas fa-${provider === 'google' ? 'google' : provider === 'discord' ? 'discord' : provider === 'twitter' ? 'twitter' : 'envelope'}" style="font-size: 10px; color: white;"></i>
                                </div>
                            </div>
                            <div>
                                <h3 style="margin-bottom: 0.25rem; color: #4a90e2;">${displayName}</h3>
                                <p style="color: var(--text-secondary); font-size: 0.9rem;">Logged in via ${provider.charAt(0).toUpperCase() + provider.slice(1)}</p>
                                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <span style="font-size: 0.8rem; color: var(--primary-green);">Rank #${stats.rank}</span>
                                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Win Rate: ${stats.winRate}%</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
                            <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 10px; padding: 1rem; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-green);">${stats.highScore.toLocaleString()}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">High Score</div>
                            </div>
                            <div style="background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 10px; padding: 1rem; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #2196F3;">${stats.gamesPlayed}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Games Played</div>
                            </div>
                            <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 10px; padding: 1rem; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #FF9800;">${stats.totalMass.toLocaleString()}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Total Mass Eaten</div>
                            </div>
                            <div style="background: rgba(156, 39, 176, 0.1); border: 1px solid rgba(156, 39, 176, 0.3); border-radius: 10px; padding: 1rem; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #9C27B0;">${stats.winRate}%</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Win Rate</div>
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

    function createLeaderboardEntry(rank, name, score, medal = '') {
        const medalStyles = {
            gold: 'background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border: 1px solid rgba(255, 215, 0, 0.5);',
            silver: 'background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.1)); border: 1px solid rgba(192, 192, 192, 0.5);',
            bronze: 'background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.1)); border: 1px solid rgba(205, 127, 50, 0.5);'
        };

        const style = medal ? medalStyles[medal] : 'background: rgba(255, 255, 255, 0.05);';
        const rankSize = medal ? `font-size: ${1.5 - rank * 0.1}rem;` : '';
        const rankColor = medal ? `color: ${medal === 'gold' ? 'gold' : medal === 'silver' ? 'silver' : '#cd7f32'};` : '';

        return `
            <div style="display: flex; align-items: center; padding: 1rem; ${style} border-radius: 10px;">
                <span style="font-weight: bold; ${rankSize} ${rankColor} width: 40px; text-align: center;">${rank}</span>
                <span style="flex: 1; margin-left: 1rem;">${name}</span>
                <span style="font-weight: bold; color: var(--primary-green);">${score}</span>
            </div>
        `;
    }

    function redirectToGame() {
        // Instead of redirecting, trigger seamless game start
        if (typeof startSeamlessGame === 'function') {
            startSeamlessGame();
        } else {
            // Fallback to redirect if function not available
            document.body.style.opacity = '0';
            setTimeout(() => window.location.href = GAME_URL, TRANSITION_DELAY);
        }
    }

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
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
                // Handle dynamic content (like profile)
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    ${template.getContent()}
                `;
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
            }, 100);
        });
    });

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