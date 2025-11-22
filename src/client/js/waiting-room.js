/**
 * Waiting Room Manager
 * Handles all waiting room UI and functionality
 */

var global = require('./global');

// Waiting room state
var waitingRoomData = null;

/**
 * Show the waiting room UI modal
 * @param {Object} data - Waiting room data from server
 */
function showWaitingRoomUI(data) {
    // Hide game UI elements
    const gameCanvas = document.getElementById('canvas');
    if (gameCanvas) {
        gameCanvas.style.opacity = '0.3';
    }

    // Hide score display while in waiting room
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
        scoreElement.style.display = 'none';
    }

    // Store waiting room data
    waitingRoomData = data;

    // Create modal container
    let modalContainer = document.getElementById('waitingRoomModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'waitingRoomModal';
        modalContainer.style.cssText = `
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            justify-content: center;
            align-items: center;
        `;
        document.body.appendChild(modalContainer);
    }

    // Create modal content matching the style of other modals
    modalContainer.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #0f1922, #1a2332);
            border: 1px solid rgba(74, 207, 160, 0.3);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
            font-family: 'Ubuntu', sans-serif;
        ">
            <h2 style="
                color: #4acfa0;
                margin-bottom: 1rem;
                font-size: 2rem;
                text-shadow: 0 2px 10px rgba(74, 207, 160, 0.5);
            ">Waiting Room</h2>

            <div style="
                display: inline-block;
                padding: 0.5rem 1.5rem;
                margin-bottom: 1.5rem;
                background: ${data.arenaType === 'PAID' ? 'linear-gradient(135deg, #4a90e2, #50e3c2)' : 'linear-gradient(135deg, #6c757d, #495057)'};
                border-radius: 20px;
                color: white;
                font-weight: bold;
                font-size: 1rem;
                letter-spacing: 1px;
            ">${data.arenaType || 'FREE'} ARENA</div>

            <div style="
                background: rgba(74, 207, 160, 0.1);
                border: 1px solid rgba(74, 207, 160, 0.2);
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            ">
                <div style="font-size: 1.1rem; color: #aaa; margin-bottom: 0.5rem;">
                    Arena ${data.arenaId}
                </div>
                <div style="font-size: 2.5rem; font-weight: bold; color: #4acfa0; margin: 0.5rem 0;">
                    ${data.playersWaiting} / ${data.minPlayers}
                </div>
                <div style="font-size: 1rem; color: #888; margin-top: 0.5rem;">
                    ${data.playersWaiting < data.minPlayers ?
                        `Waiting for ${data.minPlayers - data.playersWaiting} more player${data.minPlayers - data.playersWaiting > 1 ? 's' : ''}...` :
                        'Game will start soon!'}
                </div>
            </div>

            <div id="waitingPlayersList" style="margin-bottom: 1.5rem;"></div>

            <button id="leaveWaitingRoomBtn" style="
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                padding: 0.75rem 2rem;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                text-transform: uppercase;
                letter-spacing: 1px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.3)'">
                Leave Waiting Room
            </button>
        </div>
    `;

    // Add event listener for leave button
    document.getElementById('leaveWaitingRoomBtn').addEventListener('click', function() {
        if (window.leaveWaitingRoom) {
            window.leaveWaitingRoom();
        }
    });
}

/**
 * Update the waiting room UI with new data
 * @param {Object} data - Updated waiting room data
 */
function updateWaitingRoomUI(data) {
    const modal = document.getElementById('waitingRoomModal');
    if (!modal) return;

    // Find the player count element
    const countElement = modal.querySelector('div[style*="font-size: 2.5rem"]');
    if (countElement) {
        countElement.textContent = `${data.playersWaiting} / ${data.minPlayers}`;
    }

    // Update waiting message
    const messageElement = modal.querySelector('div[style*="font-size: 1rem"][style*="color: #888"]');
    if (messageElement) {
        messageElement.innerHTML = data.playersWaiting < data.minPlayers ?
            `Waiting for ${data.minPlayers - data.playersWaiting} more player${data.minPlayers - data.playersWaiting > 1 ? 's' : ''}...` :
            'Game will start soon!';
    }

    // Only show players list if there are 2 or more players
    const listElement = document.getElementById('waitingPlayersList');
    if (listElement) {
        if (data.players && data.players.length > 1) {
            listElement.innerHTML = `
                <div style="
                    background: rgba(74, 207, 160, 0.05);
                    border: 1px solid rgba(74, 207, 160, 0.1);
                    border-radius: 10px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                ">
                    <div style="color: #888; margin-bottom: 0.5rem; font-size: 0.9rem;">Players ready:</div>
                    ${data.players.map(p => `
                        <div style="
                            padding: 0.25rem;
                            color: ${p.ready ? '#4acfa0' : '#aaa'};
                            font-size: 0.95rem;
                        ">
                            ${p.name} ${p.ready ? '✓' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Clear the list if only 1 player
            listElement.innerHTML = '';
        }
    }
}

/**
 * Hide the waiting room UI
 */
function hideWaitingRoomUI() {
    const modal = document.getElementById('waitingRoomModal');
    if (modal) {
        modal.remove();
    }

    // Restore game canvas opacity
    const gameCanvas = document.getElementById('canvas');
    if (gameCanvas) {
        gameCanvas.style.opacity = '1';
    }

    // Restore score display
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
        scoreElement.style.display = '';
    }
}

/**
 * Show countdown overlay
 * @param {number} seconds - Countdown seconds
 */
function showCountdownUI(seconds) {
    hideWaitingRoomUI();

    let countdown = document.getElementById('countdownOverlay');
    if (!countdown) {
        countdown = document.createElement('div');
        countdown.id = 'countdownOverlay';
        countdown.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(countdown);

        // Create inner text element for the countdown number
        const countdownText = document.createElement('div');
        countdownText.id = 'countdownText';
        countdownText.style.cssText = `
            font-size: 150px;
            font-weight: bold;
            color: #00ff00;
            text-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
            font-family: 'Ubuntu', sans-serif;
            text-align: center;
            line-height: 1;
        `;
        countdown.appendChild(countdownText);
    }

    const textElement = document.getElementById('countdownText');
    textElement.textContent = seconds;

    // Simple fade-in animation
    textElement.style.opacity = '0';
    textElement.style.transform = 'scale(0.8)';
    setTimeout(() => {
        textElement.style.transition = 'all 0.3s ease';
        textElement.style.opacity = '1';
        textElement.style.transform = 'scale(1)';
    }, 10);

    // Play escape countdown sound when countdown starts (only on first call)
    if (seconds === 3 && global.soundEnabled) {
        try {
            const escapeSound = document.getElementById('escape_sound');
            if (escapeSound) {
                escapeSound.volume = 0.5;
                escapeSound.currentTime = 0;
                escapeSound.play().catch(function(e) {
                    console.log('Countdown sound playback failed:', e);
                });
            }
        } catch (e) {
            console.log('Countdown sound not available:', e);
        }
    }
}

/**
 * Update countdown display
 * @param {number} seconds - Updated countdown seconds
 */
function updateCountdownUI(seconds) {
    const textElement = document.getElementById('countdownText');
    if (!textElement) return;

    textElement.textContent = seconds > 0 ? seconds : 'GO!';

    // Keep font size consistent to prevent jumping
    textElement.style.fontSize = '150px';

    // Change color as countdown progresses
    if (seconds === 3) {
        textElement.style.color = '#00ff00';
    } else if (seconds === 2) {
        textElement.style.color = '#ffff00';
    } else if (seconds === 1) {
        textElement.style.color = '#ff6600';
    } else if (seconds === 0) {
        textElement.style.color = '#ff0000';
    }

    // Simple pulse animation without changing size
    textElement.style.opacity = '0.7';
    textElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
        textElement.style.opacity = '1';
        textElement.style.transform = 'scale(1)';
    }, 50);
}

/**
 * Hide countdown overlay
 */
function hideCountdownUI() {
    const countdown = document.getElementById('countdownOverlay');
    if (countdown) {
        countdown.remove();
    }
}

/**
 * Get stored waiting room data
 * @returns {Object|null} Waiting room data
 */
function getWaitingRoomData() {
    return waitingRoomData;
}

// Export functions
module.exports = {
    showWaitingRoomUI,
    updateWaitingRoomUI,
    hideWaitingRoomUI,
    showCountdownUI,
    updateCountdownUI,
    hideCountdownUI,
    getWaitingRoomData
};