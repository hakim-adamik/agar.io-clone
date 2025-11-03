// Landing page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const playBtn = document.getElementById('playBtn');
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    const startFromTutorial = document.getElementById('startFromTutorial');
    const tutorialModal = document.getElementById('tutorialModal');
    const sectionModal = document.getElementById('sectionModal');
    const modalContent = document.getElementById('modalContent');
    const navItems = document.querySelectorAll('.nav-item');
    const closeButtons = document.querySelectorAll('.close-modal');

    // Play button - redirect to game
    playBtn.addEventListener('click', function() {
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        this.appendChild(ripple);

        // Fade out and redirect
        setTimeout(() => {
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        }, 400);
    });

    // How to Play button - show tutorial modal
    howToPlayBtn.addEventListener('click', function() {
        showTutorialModal();
    });

    // Start from tutorial button
    if (startFromTutorial) {
        startFromTutorial.addEventListener('click', function() {
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        });
    }

    // Show tutorial modal
    function showTutorialModal() {
        // Create tutorial content if modal doesn't exist
        if (!document.getElementById('tutorialModal')) {
            createTutorialModal();
        }
        document.getElementById('tutorialModal').classList.add('show');
    }

    function createTutorialModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'tutorialModal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>How to Play</h2>
                <div class="tutorial-content">
                    <div class="tutorial-step">
                        <i class="fas fa-mouse-pointer"></i>
                        <h3>Movement</h3>
                        <p>Move your mouse to control your cell's direction</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-cookie-bite"></i>
                        <h3>Grow</h3>
                        <p>Eat food pellets and smaller players to increase mass</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-divide"></i>
                        <h3>Split (Space)</h3>
                        <p>Split into multiple cells to capture other players</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-hand-holding-heart"></i>
                        <h3>Feed (W)</h3>
                        <p>Eject mass to feed teammates or bait enemies</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-shield-virus"></i>
                        <h3>Viruses</h3>
                        <p>Green spiky cells split you if you're too big</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-running"></i>
                        <h3>Escape</h3>
                        <p>Exit strategically before being eaten to secure your gains</p>
                    </div>
                    <div class="tutorial-step">
                        <i class="fas fa-crown"></i>
                        <h3>Objective</h3>
                        <p>Dominate the leaderboard by earning more points!</p>
                    </div>
                </div>
                <button class="modal-button" id="startFromTutorial">Start Playing</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal.querySelector('#startFromTutorial').addEventListener('click', () => {
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        });
    }

    // Bottom navigation items
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;

            // Handle main section differently
            if (section === 'main') {
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                return;
            }

            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');

            // Show appropriate content in modal
            showSectionContent(section);
        });
    });

    // Close modal buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal')) {
            e.target.closest('.modal').classList.remove('show');
            navItems.forEach(nav => {
                if (nav.dataset.section !== 'main') {
                    nav.classList.remove('active');
                }
            });
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
            navItems.forEach(nav => {
                if (nav.dataset.section !== 'main') {
                    nav.classList.remove('active');
                }
            });
        }
    });

    // Show section content
    function showSectionContent(section) {
        let content = '';

        switch(section) {
            case 'social':
                content = `
                    <h2><i class="fab fa-discord"></i> Social Media</h2>
                    <div class="social-links" style="display: grid; gap: 1rem; margin-top: 1.5rem;">
                        <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <i class="fab fa-discord" style="font-size: 1.5rem; color: #7289da; width: 40px;"></i>
                            <span>Join our Discord Server</span>
                        </a>
                        <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <i class="fab fa-telegram" style="font-size: 1.5rem; color: #0088cc; width: 40px;"></i>
                            <span>Telegram Community</span>
                        </a>
                        <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <i class="fa-brands fa-x-twitter" style="font-size: 1.5rem; color: white; width: 40px;"></i>
                            <span>Follow on X</span>
                        </a>
                        <a href="#" class="social-link" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; color: #fff; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <i class="fab fa-youtube" style="font-size: 1.5rem; color: #ff0000; width: 40px;"></i>
                            <span>YouTube Channel</span>
                        </a>
                    </div>
                `;
                break;

            case 'support':
                content = `
                    <h2><i class="fas fa-headset"></i> Support</h2>
                    <div style="display: grid; gap: 1rem; margin-top: 1.5rem;">
                        <div style="padding: 1.5rem; background: rgba(132, 204, 22, 0.1); border-radius: 10px; text-align: center;">
                            <i class="fas fa-book" style="font-size: 2rem; color: var(--primary-green); margin-bottom: 0.5rem;"></i>
                            <h3>Game Guide</h3>
                            <p style="color: var(--text-secondary); margin: 0.5rem 0;">Complete gameplay documentation</p>
                            <button class="modal-button" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">View Guide</button>
                        </div>
                        <div style="padding: 1.5rem; background: rgba(59, 130, 246, 0.1); border-radius: 10px; text-align: center;">
                            <i class="fas fa-question-circle" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 0.5rem;"></i>
                            <h3>FAQ</h3>
                            <p style="color: var(--text-secondary); margin: 0.5rem 0;">Frequently asked questions</p>
                            <button class="modal-button" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">View FAQ</button>
                        </div>
                        <div style="padding: 1.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 10px; text-align: center;">
                            <i class="fas fa-bug" style="font-size: 2rem; color: var(--primary-red); margin-bottom: 0.5rem;"></i>
                            <h3>Report Issue</h3>
                            <p style="color: var(--text-secondary); margin: 0.5rem 0;">Found a bug? Let us know!</p>
                            <button class="modal-button" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">Report Bug</button>
                        </div>
                    </div>
                `;
                break;

            case 'leaders':
                content = `
                    <h2><i class="fas fa-trophy"></i> Leaderboard</h2>
                    <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0;">
                        <button class="tab-btn active" style="padding: 0.5rem 1rem; background: var(--primary-green); color: white; border: none; border-radius: 20px; cursor: pointer;">Today</button>
                        <button class="tab-btn" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">This Week</button>
                        <button class="tab-btn" style="padding: 0.5rem 1rem; background: transparent; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; cursor: pointer;">All Time</button>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border-radius: 10px; border: 1px solid rgba(255, 215, 0, 0.5);">
                            <span style="font-weight: bold; font-size: 1.5rem; width: 40px; text-align: center; color: gold;">1</span>
                            <span style="flex: 1; margin-left: 1rem;">ChampionPlayer</span>
                            <span style="font-weight: bold; color: var(--primary-green);">52,450</span>
                        </div>
                        <div style="display: flex; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.1)); border-radius: 10px; border: 1px solid rgba(192, 192, 192, 0.5);">
                            <span style="font-weight: bold; font-size: 1.3rem; width: 40px; text-align: center; color: silver;">2</span>
                            <span style="flex: 1; margin-left: 1rem;">ProGamer2024</span>
                            <span style="font-weight: bold; color: var(--primary-green);">48,320</span>
                        </div>
                        <div style="display: flex; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.1)); border-radius: 10px; border: 1px solid rgba(205, 127, 50, 0.5);">
                            <span style="font-weight: bold; font-size: 1.2rem; width: 40px; text-align: center; color: #cd7f32;">3</span>
                            <span style="flex: 1; margin-left: 1rem;">EliteCells</span>
                            <span style="font-weight: bold; color: var(--primary-green);">45,100</span>
                        </div>
                        <div style="display: flex; align-items: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                            <span style="font-weight: bold; width: 40px; text-align: center;">4</span>
                            <span style="flex: 1; margin-left: 1rem;">MasterEater</span>
                            <span style="font-weight: bold; color: var(--primary-green);">42,800</span>
                        </div>
                        <div style="display: flex; align-items: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                            <span style="font-weight: bold; width: 40px; text-align: center;">5</span>
                            <span style="flex: 1; margin-left: 1rem;">CellHunter</span>
                            <span style="font-weight: bold; color: var(--primary-green);">40,550</span>
                        </div>
                    </div>
                `;
                break;

            case 'profile':
                content = `
                    <h2><i class="fas fa-user-circle"></i> Player Profile</h2>
                    <div style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 10px; margin: 1.5rem 0; display: flex; align-items: center; gap: 1.5rem;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #4a90e2, #50e3c2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <h3 style="margin-bottom: 0.25rem;">Guest Player</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">Not logged in</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1.5rem 0;">
                        <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center;">
                            <i class="fas fa-gamepad" style="font-size: 1.5rem; color: #4a90e2; display: block; margin-bottom: 0.5rem;"></i>
                            <span style="display: block; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">0</span>
                            <span style="display: block; color: var(--text-secondary); font-size: 0.8rem;">Games Played</span>
                        </div>
                        <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center;">
                            <i class="fas fa-crown" style="font-size: 1.5rem; color: #4a90e2; display: block; margin-bottom: 0.5rem;"></i>
                            <span style="display: block; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">0</span>
                            <span style="display: block; color: var(--text-secondary); font-size: 0.8rem;">Best Rank</span>
                        </div>
                        <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center;">
                            <i class="fas fa-clock" style="font-size: 1.5rem; color: #4a90e2; display: block; margin-bottom: 0.5rem;"></i>
                            <span style="display: block; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">0h</span>
                            <span style="display: block; color: var(--text-secondary); font-size: 0.8rem;">Play Time</span>
                        </div>
                        <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center;">
                            <i class="fas fa-chart-line" style="font-size: 1.5rem; color: #4a90e2; display: block; margin-bottom: 0.5rem;"></i>
                            <span style="display: block; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">0</span>
                            <span style="display: block; color: var(--text-secondary); font-size: 0.8rem;">High Score</span>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: rgba(132, 204, 22, 0.1); border-radius: 10px;">
                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">Sign in to track your progress and compete on the leaderboard!</p>
                        <button class="modal-button" style="padding: 0.75rem 2rem; font-size: 1rem;">Sign In / Register</button>
                    </div>
                `;
                break;
        }

        if (!sectionModal) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'sectionModal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div id="modalContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('sectionModal').classList.add('show');
    }

    // Add floating animation to background cells
    const floatingCells = document.querySelectorAll('.floating-cell');
    floatingCells.forEach((cell, index) => {
        cell.style.animationDelay = `${index * 2}s`;
    });

    // Add parallax effect on mouse move
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    });

    function animateParallax() {
        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;

        const previewCells = document.querySelector('.preview-cells');
        if (previewCells) {
            previewCells.style.transform = `translate(${targetX}px, ${targetY}px)`;
        }

        requestAnimationFrame(animateParallax);
    }
    animateParallax();
});