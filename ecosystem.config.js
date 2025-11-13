// PM2 Configuration for production deployment
// PM2 provides process management, auto-restart, and clustering for Node.js apps

module.exports = {
  apps: [{
    name: 'agar-game-server',
    script: './bin/server/server.js',

    // Instances
    instances: 1,  // Single instance for game state consistency
    exec_mode: 'fork',  // Fork mode (not cluster) to maintain game state

    // Performance
    node_args: '--max-old-space-size=2048',  // 2GB heap for Node.js

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Auto-restart settings
    watch: false,  // Don't watch files in production
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // Resource limits
    max_memory_restart: '1800M',  // Restart if memory exceeds 1.8GB
  }]
};

