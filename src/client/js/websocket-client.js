// WebSocket client wrapper that mimics Socket.IO interface
(function(window) {
    'use strict';

    // Create a Socket.IO-compatible wrapper around raw WebSocket
    class WebSocketClient {
        constructor(url, options) {
            this.url = url || this.buildUrl();
            this.options = options || {};
            this.ws = null;
            this.eventHandlers = {};
            this.connected = false;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.reconnectDelay = 1000;
            this.pingInterval = null;
        }

        buildUrl() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.WS_PORT || window.location.port || 3000;
            return `${protocol}//${host}:${port}`;
        }

        connect(query) {
            // Build URL with query parameters
            let url = this.url;
            if (query) {
                const params = new URLSearchParams();
                if (typeof query === 'string') {
                    // Parse Socket.IO style query string
                    query.split('&').forEach(pair => {
                        const [key, value] = pair.split('=');
                        params.append(key, decodeURIComponent(value || ''));
                    });
                } else if (typeof query === 'object') {
                    Object.entries(query).forEach(([key, value]) => {
                        if (value !== null && value !== undefined) {
                            params.append(key, value);
                        }
                    });
                }
                url += '?' + params.toString();
            }

            console.log('[WebSocketClient] Connecting to:', url);

            this.ws = new WebSocket(url);
            this.setupEventHandlers();
        }

        setupEventHandlers() {
            this.ws.onopen = () => {
                console.log('[WebSocketClient] Connected!');
                this.connected = true;
                this.reconnectAttempts = 0;

                // Start ping interval to keep connection alive
                this.startPing();

                // Trigger Socket.IO-style connect event
                this.trigger('connect');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Map WebSocket message types to Socket.IO events
                    switch(data.type) {
                        case 'welcome':
                            this.trigger('welcome', data);
                            break;
                        case 'serverTellPlayerMove':
                            // Extract data in Socket.IO format
                            const playerData = data.players && data.players[0] || {};
                            const userData = data.players || [];
                            const foodsList = data.foods || [];
                            const massList = data.masses || [];
                            const virusList = data.viruses || [];

                            this.trigger('serverTellPlayerMove',
                                playerData, userData, foodsList, massList, virusList);
                            break;
                        case 'playerDisconnect':
                            this.trigger('playerDisconnect', data);
                            break;
                        case 'playerJoin':
                            this.trigger('playerJoin', data);
                            break;
                        case 'playerDied':
                            this.trigger('playerDied', data);
                            break;
                        case 'leaderboard':
                            this.trigger('leaderboard', data.leaderboard);
                            break;
                        case 'RIP':
                            this.trigger('RIP');
                            break;
                        case 'chat':
                            this.trigger('chat', data);
                            break;
                        default:
                            // Trigger generic event
                            if (data.type) {
                                this.trigger(data.type, data);
                            }
                    }
                } catch (err) {
                    console.error('[WebSocketClient] Parse error:', err);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocketClient] Error:', error);
                this.trigger('connect_error', error);
            };

            this.ws.onclose = () => {
                console.log('[WebSocketClient] Disconnected');
                this.connected = false;
                this.stopPing();
                this.trigger('disconnect');

                // Auto-reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WebSocketClient] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => {
                        this.connect(this.options.query);
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            };
        }

        startPing() {
            // Send ping every 25 seconds to keep connection alive
            this.pingInterval = setInterval(() => {
                if (this.connected && this.ws.readyState === WebSocket.OPEN) {
                    this.emit('ping');
                }
            }, 25000);
        }

        stopPing() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
        }

        // Socket.IO-compatible methods
        on(event, handler) {
            if (!this.eventHandlers[event]) {
                this.eventHandlers[event] = [];
            }
            this.eventHandlers[event].push(handler);
            return this;
        }

        off(event, handler) {
            if (this.eventHandlers[event]) {
                if (handler) {
                    this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
                } else {
                    delete this.eventHandlers[event];
                }
            }
            return this;
        }

        trigger(event, ...args) {
            if (this.eventHandlers[event]) {
                this.eventHandlers[event].forEach(handler => {
                    try {
                        handler(...args);
                    } catch (err) {
                        console.error(`[WebSocketClient] Error in ${event} handler:`, err);
                    }
                });
            }
        }

        emit(event, data, callback) {
            if (!this.connected || this.ws.readyState !== WebSocket.OPEN) {
                console.warn('[WebSocketClient] Not connected, cannot emit:', event);
                return;
            }

            // Convert Socket.IO events to WebSocket messages
            let message = { type: event };

            // Map Socket.IO event names to our protocol
            switch(event) {
                case '0': // Move
                    message = { type: 'move', x: data.x, y: data.y };
                    break;
                case '1': // Split
                    message = { type: 'split' };
                    break;
                case '2': // Eject
                    message = { type: 'eject' };
                    break;
                case 'respawn':
                    message = { type: 'respawn', name: data };
                    break;
                case 'chat':
                    message = { type: 'chat', message: data };
                    break;
                case 'ping':
                    message = { type: 'ping' };
                    break;
                case 'pingcheck':
                    message = { type: 'pingcheck' };
                    break;
                default:
                    // Include data if provided
                    if (data !== undefined) {
                        if (typeof data === 'object') {
                            message = { ...message, ...data };
                        } else {
                            message.data = data;
                        }
                    }
            }

            try {
                this.ws.send(JSON.stringify(message));
                if (callback) callback();
            } catch (err) {
                console.error('[WebSocketClient] Send error:', err);
                if (callback) callback(err);
            }
        }

        close() {
            if (this.ws) {
                this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
                this.ws.close();
                this.ws = null;
            }
            this.stopPing();
        }

        // Socket.IO compatible properties
        get id() {
            return this.playerId || null;
        }

        get disconnected() {
            return !this.connected;
        }
    }

    // Socket.IO-compatible factory function
    window.createWebSocketClient = function(options) {
        const client = new WebSocketClient(null, options);

        // Return Socket.IO-compatible interface
        return {
            connect: () => client.connect(options.query),
            on: (event, handler) => client.on(event, handler),
            off: (event, handler) => client.off(event, handler),
            emit: (event, data, callback) => client.emit(event, data, callback),
            close: () => client.close(),
            disconnect: () => client.close(),
            get connected() { return client.connected; },
            get disconnected() { return client.disconnected; },
            get id() { return client.id; }
        };
    };

    console.log('[WebSocketClient] WebSocket client wrapper loaded');

})(window);