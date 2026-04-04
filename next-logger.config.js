const pino = require('pino');

// Determine environment
const isDev = process.env.NODE_ENV !== 'production';

// Basic setup
const transportTargets = [];

// 1. Standard console logging
if (isDev) {
    transportTargets.push({
        target: 'pino/file',
        options: { destination: 1 }, // stdout
        level: 'debug'
    });
} else {
    // In production, just standard pino logging to stdout/stderr
    transportTargets.push({
        target: 'pino/file',
        options: { destination: 1 }, // 1 is stdout
        level: 'info'
    });
}

// 2. Optional: Log to file asynchronously
if (process.env.LOG_TO_FILE === 'true') {
    transportTargets.push({
        target: 'pino/file',
        options: {
            destination: process.env.LOG_FILE_PATH || './app.log',
            mkdir: true,
            append: true,
        },
        level: 'info' // Or configure via process.env.LOG_FILE_LEVEL
    });
}

// 3. Optional: Send to external system asynchronously via HTTP
if (process.env.LOG_EXTERNAL_URL) {
    transportTargets.push({
        target: 'pino-http-send',
        options: {
            url: process.env.LOG_EXTERNAL_URL,
            method: 'POST',
            // You can add headers here if your external system requires auth:
            // headers: { Authorization: `Bearer ${process.env.LOG_EXTERNAL_TOKEN}` }
        },
        level: 'info' // Or configure via process.env.LOG_EXTERNAL_LEVEL
    });
}

const transport = pino.transport({
    targets: transportTargets,
});

const logger = defaultConfig => pino(
    {
        ...defaultConfig,
        // Optionally add base info to every log
        base: {
            ...defaultConfig?.base,
            env: process.env.NODE_ENV,
        }
    },
    transport
);

module.exports = {
    logger,
};
