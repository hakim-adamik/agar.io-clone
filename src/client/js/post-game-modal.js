/**
 * Post-Game Modal Manager
 * Handles the display and interaction of the post-game summary modal
 */

(function() {
    'use strict';

    // Cache DOM elements
    let modal = null;
    let content = null;

    /**
     * Initialize the post-game modal system
     */
    function init() {
        modal = document.getElementById('postGameModal');
        content = document.getElementById('postGameContent');

        // Check if returning from game on page load
        checkForPostGameTrigger();
    }

    /**
     * Check if we should show the post-game modal
     */
    function checkForPostGameTrigger() {
        const wasInGame = sessionStorage.getItem('wasInGame') === 'true';
        const exitReason = sessionStorage.getItem('gameExitReason');

        // Only show modal if we were in game AND have a valid exit reason
        // This prevents showing on page refresh
        if (wasInGame && exitReason) {
            sessionStorage.removeItem('wasInGame');
            sessionStorage.removeItem('gameExitReason');
            // Small delay for smooth transition
            setTimeout(show, 500);
        } else if (wasInGame && !exitReason) {
            // Clear stale wasInGame flag from refresh/crash
            sessionStorage.removeItem('wasInGame');
        }
    }

    /**
     * Show the post-game modal with game summary
     */
    function show() {
        if (!modal || !content) {
            console.warn('Post-game modal elements not found');
            return;
        }

        // Get game data
        const gameData = gatherGameData();

        // Build and display modal content
        content.innerHTML = buildModalContent(gameData);

        // Show modal with animation
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('modal-active');
        });

        // Trigger confetti for wins (except unprofitable escapes in PLAY TO EARN)
        const isUnprofitableEscape = gameData.isWin && gameData.arenaType === 'PLAY TO EARN' &&
                                      gameData.walletChange !== null && gameData.walletChange < 0;
        if (gameData.isWin && !isUnprofitableEscape) {
            triggerConfetti();
        }
    }

    /**
     * Create confetti animation for victories
     */
    function triggerConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10001;
            overflow: hidden;
        `;

        // Create confetti particles
        const colors = ['#FFD700', '#4acfa0', '#50e3c2', '#FFA500', '#FF69B4', '#00CED1'];
        const particleCount = 150;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 10 + 5;
            const leftPosition = Math.random() * 100;
            const animationDuration = Math.random() * 3 + 2;
            const animationDelay = Math.random() * 2;

            particle.style.cssText = `
                position: absolute;
                background: ${color};
                width: ${size}px;
                height: ${size}px;
                left: ${leftPosition}%;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                transform: rotate(${Math.random() * 360}deg);
                animation: confettiFall ${animationDuration}s linear ${animationDelay}s forwards;
            `;

            confettiContainer.appendChild(particle);
        }

        // Add CSS animation
        if (!document.querySelector('#confettiStyles')) {
            const style = document.createElement('style');
            style.id = 'confettiStyles';
            style.innerHTML = `
                @keyframes confettiFall {
                    0% {
                        top: -20px;
                        transform: translateX(0) rotate(0deg);
                        opacity: 1;
                    }
                    25% {
                        transform: translateX(${Math.random() * 100 - 50}px) rotate(90deg);
                    }
                    50% {
                        transform: translateX(${Math.random() * 100 - 50}px) rotate(180deg);
                    }
                    75% {
                        transform: translateX(${Math.random() * 100 - 50}px) rotate(270deg);
                    }
                    100% {
                        top: 110%;
                        transform: translateX(${Math.random() * 200 - 100}px) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(confettiContainer);

        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 5000);
    }

    /**
     * Hide the post-game modal
     */
    function hide() {
        if (!modal) return;

        modal.classList.remove('modal-active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Match CSS transition duration
    }

    /**
     * Gather all relevant game data
     */
    function gatherGameData() {
        const lastScore = parseFloat(localStorage.getItem('lastScore') || '0');
        const lastArenaType = sessionStorage.getItem('lastArenaType') || 'PRACTICE MODE';
        const exitReason = sessionStorage.getItem('gameExitReason') || 'death';
        const isAuthenticated = window.PrivyAuth && window.PrivyAuth.isAuthenticated();

        // Placeholder stats - will be implemented later
        const timePlayed = sessionStorage.getItem('gameTimePlayed') || "0:00";
        const enemiesEaten = parseInt(sessionStorage.getItem('gameEnemiesEaten') || '0');

        // Determine if player won (escaped) or lost (died)
        const isWin = exitReason === 'escape';

        // Calculate wallet change for PLAY TO EARN mode
        // In PLAY TO EARN: entry fee is $1.00
        // If player escaped, they get their score as earnings
        // Net change = earnings - entry fee
        let walletChange = null;
        if (lastArenaType === 'PLAY TO EARN' && isAuthenticated) {
            const entryFee = 1.0;
            if (isWin) {
                // Escaped successfully - earned their score minus entry fee
                walletChange = lastScore - entryFee;
            } else {
                // Died - lost the entry fee
                walletChange = -entryFee;
            }
        }

        return {
            score: lastScore,
            arenaType: lastArenaType,
            isWin,
            isAuthenticated,
            timePlayed,
            enemiesEaten,
            walletChange,
            exitReason
        };
    }

    /**
     * Build the modal HTML content
     */
    function buildModalContent(data) {
        const { score, arenaType, isWin, isAuthenticated, timePlayed, enemiesEaten, walletChange } = data;

        // Determine compact header based on performance
        let headerContent;

        // For PLAY TO EARN: if player escaped but with net loss, treat it as a loss
        const isUnprofitableEscape = isWin && arenaType === 'PLAY TO EARN' && walletChange !== null && walletChange < 0;

        if (isWin && !isUnprofitableEscape) {
            // Profitable escape or practice mode escape (or break even)
            if (score >= 100) {
                headerContent = `
                    <i class="fas fa-crown post-game-icon winner" style="font-size: 3rem;"></i>
                    <h2 class="post-game-title winner" style="font-size: 1.75rem; margin: 0.5rem 0;">LEGENDARY!</h2>
                `;
            } else if (score >= 50) {
                headerContent = `
                    <i class="fas fa-trophy post-game-icon winner" style="font-size: 3rem;"></i>
                    <h2 class="post-game-title winner" style="font-size: 1.75rem; margin: 0.5rem 0;">EPIC WIN!</h2>
                `;
            } else if (score >= 10) {
                headerContent = `
                    <i class="fas fa-rocket post-game-icon winner" style="font-size: 3rem;"></i>
                    <h2 class="post-game-title winner" style="font-size: 1.75rem; margin: 0.5rem 0;">TO THE MOON!</h2>
                `;
            } else {
                headerContent = `
                    <i class="fas fa-rocket post-game-icon winner" style="font-size: 3rem;"></i>
                    <h2 class="post-game-title winner" style="font-size: 1.75rem; margin: 0.5rem 0;">Successfully Escaped!</h2>
                `;
            }
        } else {
            // Death or unprofitable escape in PLAY TO EARN
            headerContent = `
                <i class="fas fa-skull-crossbones post-game-icon retry" style="font-size: 3rem;"></i>
                <h2 class="post-game-title retry" style="font-size: 1.75rem; margin: 0.5rem 0;">Better Luck Next Time!</h2>
            `;
        }

        return `
            <div class="post-game-container" style="padding: 1.5rem;">
                <!-- Compact Header -->
                <div class="post-game-header" style="margin-bottom: 1rem;">
                    ${headerContent}
                </div>

                ${walletChange !== null ? `
                    <!-- Wallet Change Section (Redesigned for PLAY TO EARN) -->
                    <div style="padding: 1rem; margin-bottom: 1rem; background: ${walletChange >= 0 ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(46, 125, 50, 0.1))' : 'linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(198, 40, 40, 0.1))'}; border: 1px solid ${walletChange >= 0 ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}; border-radius: 15px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                            <div style="flex: 1;">
                                <div style="font-size: 0.75rem; color: ${walletChange >= 0 ? '#4CAF50' : '#ff4757'}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1rem;">${walletChange >= 0 ? '💰' : '💸'}</span>
                                    <span>${walletChange >= 0 ? 'Earnings' : 'Net Result'}</span>
                                </div>
                                <div style="font-size: 2.25rem; margin: 0; color: ${walletChange >= 0 ? '#4CAF50' : '#ff4757'}; font-weight: bold;">
                                    ${walletChange >= 0 ? '+' : '-'}$${Math.abs(walletChange).toFixed(2)}
                                </div>
                            </div>
                            ${isWin ? `
                                <div style="text-align: right; padding-left: 1rem; border-left: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="font-size: 0.7rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 0.25rem;">Breakdown</div>
                                    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">
                                        Score: <span style="color: #4CAF50;">+$${score.toFixed(2)}</span>
                                    </div>
                                    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">
                                        Fee: <span style="color: #ff4757;">-$1.00</span>
                                    </div>
                                </div>
                            ` : `
                                <div style="text-align: right;">
                                    <div style="font-size: 0.7rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 0.25rem;">Score</div>
                                    <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.7);">
                                        $${score.toFixed(2)}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                ` : ''}

                <!-- Compact Stats Grid -->
                <div class="post-game-stats" style="padding: 1rem; margin-bottom: 1rem;">
                    <div class="stats-grid" style="gap: 0.75rem;">
                        <div class="stat-item" style="padding: 0.5rem;">
                            <div class="stat-label" style="font-size: 0.65rem;">Score</div>
                            <div class="stat-value ${isWin ? 'highlight' : ''}" style="font-size: 1.1rem;">
                                ${score.toFixed(4)}
                            </div>
                        </div>
                        <div class="stat-item" style="padding: 0.5rem;">
                            <div class="stat-label" style="font-size: 0.65rem;">Arena</div>
                            <div class="stat-value" style="font-size: 0.9rem;">
                                ${arenaType === 'PRACTICE MODE' ? 'PRACTICE' : 'PAID'}
                            </div>
                        </div>
                        <div class="stat-item" style="padding: 0.5rem;">
                            <div class="stat-label" style="font-size: 0.65rem;">Time</div>
                            <div class="stat-value" style="font-size: 1rem;">
                                ${timePlayed}
                            </div>
                        </div>
                        <div class="stat-item" style="padding: 0.5rem;">
                            <div class="stat-label" style="font-size: 0.65rem;">Enemies</div>
                            <div class="stat-value" style="font-size: 1rem;">
                                ${enemiesEaten}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="post-game-actions">
                    <button class="btn-rejoin" onclick="PostGameModal.rejoin()">
                        <i class="fas fa-play"></i>
                        Re-join
                    </button>
                    <button class="btn-another-arena" onclick="PostGameModal.selectAnotherArena()">
                        Select Another Arena
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle rejoin action
     */
    function rejoin() {
        // Play sound if available
        if (window.playMenuSelectionSound) {
            window.playMenuSelectionSound();
        }

        const lastArenaType = sessionStorage.getItem('lastArenaType');
        hide();

        // Re-join the same arena type
        if (lastArenaType === 'PLAY TO EARN') {
            const isAuthenticated = window.PrivyAuth && window.PrivyAuth.isAuthenticated();
            if (isAuthenticated) {
                redirectToGame('PAID');
            } else {
                // Show signup prompt for paid arena
                if (window.showPaidArenaSignupPrompt) {
                    window.showPaidArenaSignupPrompt();
                }
            }
        } else {
            redirectToGame('FREE');
        }
    }

    /**
     * Handle select another arena action
     */
    function selectAnotherArena() {
        // Play sound if available
        if (window.playClickSound) {
            window.playClickSound();
        }
        hide();
        // User returns to landing page to select another arena
    }

    /**
     * Redirect to game (helper function)
     */
    function redirectToGame(arenaType) {
        // This should call the main game redirect function
        if (window.redirectToGame) {
            window.redirectToGame(arenaType);
        } else {
            console.warn('redirectToGame function not available');
        }
    }

    /**
     * Mark that player is entering a game
     */
    function markGameEntry(arenaType) {
        sessionStorage.setItem('wasInGame', 'true');
        sessionStorage.setItem('lastArenaType',
            arenaType === 'FREE' ? 'PRACTICE MODE' : 'PLAY TO EARN'
        );
    }

    // Expose public API
    window.PostGameModal = {
        init,
        show,
        hide,
        rejoin,
        selectAnotherArena,
        markGameEntry
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();