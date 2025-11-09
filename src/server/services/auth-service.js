/*jslint node: true */
'use strict';

const UserRepository = require('../repositories/user-repository');
const StatsRepository = require('../repositories/stats-repository');
const PreferencesRepository = require('../repositories/preferences-repository');
const SessionRepository = require('../repositories/session-repository');

class AuthService {
    /**
     * Handle user authentication from Privy
     * Creates user if doesn't exist, returns user data with preferences
     */
    static async authenticateUser(privyData) {
        try {
            // Find or create user
            const user = await UserRepository.findOrCreateByPrivyId(privyData.privyId, {
                username: privyData.username || privyData.email?.split('@')[0] || null,
                email: privyData.email,
                authProvider: privyData.authProvider || 'privy',
                avatarUrl: privyData.avatarUrl
            });

            // Initialize stats if new user
            const stats = await StatsRepository.getUserStats(user.id);

            // Get or create preferences
            const preferences = await PreferencesRepository.getPreferences(user.id);

            // Get user rank
            const rank = await StatsRepository.getUserRank(user.id);

            return {
                user: {
                    id: user.id,
                    privyId: user.privy_id,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatar_url,
                    bio: user.bio,
                    region: user.region,
                    isPremium: user.is_premium === 1,
                    createdAt: user.created_at
                },
                stats: {
                    gamesPlayed: stats.games_played,
                    totalMassEaten: stats.total_mass_eaten,
                    totalPlayersEaten: stats.total_players_eaten,
                    totalTimePlayed: stats.total_playtime,
                    highScore: stats.highest_mass,
                    longestSurvival: stats.longest_survival,
                    rank: rank
                },
                preferences: {
                    darkMode: preferences.dark_mode === 1,
                    showMass: preferences.show_mass === 1,
                    showBorder: preferences.show_border === 1,
                    showFps: preferences.show_fps === 1,
                    showGrid: preferences.show_grid === 1,
                    continuity: preferences.continuity === 1,
                    roundFood: preferences.round_food === 1,
                    skinId: preferences.skin_id
                }
            };
        } catch (error) {
            console.error('[AUTH SERVICE] Error authenticating user:', error);
            throw error;
        }
    }

    /**
     * Handle guest user (no authentication)
     */
    static generateGuestData() {
        const guestId = Math.floor(Math.random() * 100000);
        return {
            user: {
                id: null,
                privyId: null,
                username: `Guest_${guestId}`,
                isGuest: true
            },
            stats: {
                gamesPlayed: 0,
                totalMassEaten: 0,
                totalPlayersEaten: 0,
                totalTimePlayed: 0,
                highScore: 0,
                longestSurvival: 0,
                rank: null
            },
            preferences: {
                darkMode: true,
                showMass: true,
                showBorder: true,
                showFps: false,
                showGrid: true,
                continuity: true,
                roundFood: true,
                skinId: null
            }
        };
    }

    /**
     * Start a new game session for authenticated user
     */
    static async startGameSession(userId, arenaId, playerName) {
        if (!userId) return null;

        try {
            // End any existing active sessions
            const activeSession = await SessionRepository.getActiveSession(userId);
            if (activeSession) {
                await SessionRepository.endSession(activeSession.id, {
                    final_score: 0,
                    final_mass: 0,
                    mass_eaten: 0,
                    players_eaten: 0
                });
            }

            // Create new session
            const sessionId = await SessionRepository.createSession(userId, arenaId, playerName);
            return sessionId;
        } catch (error) {
            console.error('[AUTH SERVICE] Error starting game session:', error);
            return null;
        }
    }

    /**
     * End a game session and update stats
     */
    static async endGameSession(sessionId, sessionData) {
        if (!sessionId) return;

        try {
            // End the session and get final data
            const finalData = await SessionRepository.endSession(sessionId, sessionData);

            // Get the session to find user ID
            const sessions = await SessionRepository.getUserSessions(sessionData.userId, 1);
            if (sessions.length > 0) {
                // Update cumulative stats
                await StatsRepository.updateStats(sessionData.userId, finalData);
            }
        } catch (error) {
            console.error('[AUTH SERVICE] Error ending game session:', error);
        }
    }

    /**
     * Update user preferences
     */
    static async updateUserPreferences(userId, preferences) {
        if (!userId) return false;

        try {
            await PreferencesRepository.updatePreferences(userId, preferences);
            return true;
        } catch (error) {
            console.error('[AUTH SERVICE] Error updating preferences:', error);
            return false;
        }
    }

    /**
     * Check username availability
     */
    static async checkUsernameAvailability(username, userId = null) {
        try {
            return await UserRepository.isUsernameAvailable(username, userId);
        } catch (error) {
            console.error('[AUTH SERVICE] Error checking username:', error);
            return false;
        }
    }

    /**
     * Update user profile
     */
    static async updateUserProfile(userId, profileData) {
        if (!userId) return false;

        try {
            // Check username availability if changing
            if (profileData.username) {
                const available = await this.checkUsernameAvailability(profileData.username, userId);
                if (!available) {
                    throw new Error('Username already taken');
                }
            }

            await UserRepository.updateProfile(userId, profileData);
            return true;
        } catch (error) {
            console.error('[AUTH SERVICE] Error updating profile:', error);
            throw error;
        }
    }
}

module.exports = AuthService;