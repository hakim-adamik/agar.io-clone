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
            content: `
                <div style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 10px; margin: 1.5rem 0; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <h3 style="margin-bottom: 0.25rem;">Guest Player</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Not logged in</p>
                    </div>
                </div>
                <div style="text-align: center; padding: 2rem; margin: 2rem 0;">
                    <i class="fas fa-lock" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 1rem;">Sign in to track your progress and compete on the leaderboard!</p>
                    <button class="modal-button" style="padding: 0.75rem 2rem; font-size: 1rem;">Sign In / Register</button>
                </div>
            `
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
    elements.startFromTutorial?.addEventListener('click', redirectToGame);

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
            } else {
                modalContent.innerHTML = `
                    <h2>${template.title}</h2>
                    ${template.content}
                `;
            }

            showModal('sectionModal');
        });
    });

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