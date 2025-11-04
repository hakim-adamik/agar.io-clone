// Environment configuration loader
// Loads .env file if it exists

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.join(__dirname, '../../../.env');

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
            // Skip comments and empty lines
            if (line.startsWith('#') || !line.trim()) return;

            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                // Only set if not already defined (allows real env vars to override)
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = value;
                }
            }
        });

        console.log('.env file loaded');
    }
}

// Load environment variables on module import
loadEnvFile();

module.exports = { loadEnvFile };