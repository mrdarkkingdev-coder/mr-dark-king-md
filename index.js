require('dotenv').config();

// Import bots
const { startWhatsAppBot } = require('./whatsapp.js');
const { startTelegramBot } = require('./telegram.js');

const BOT_NAME = "MR DARK KING MD";

console.log(`
╔════════════════════════════════════╗
║     ${BOT_NAME}     ║
║   WhatsApp + Telegram Bot v1.0     ║
╚════════════════════════════════════╝
`);

console.log('🚀 Starting bot services...');
console.log('📱 WhatsApp Bot: Initializing...');
console.log('🤖 Telegram Bot: Launching...');

// Start both bots
const startBots = async () => {
    try {
        // Start Telegram Bot
        await startTelegramBot();
        
        // Start WhatsApp Bot (it auto-starts in the module)
        console.log('📱 WhatsApp Bot: Ready...');
        
        console.log('\n✅ Both bots are running!');
        console.log('Press Ctrl+C to stop\n');
    } catch (error) {
        console.error('❌ Failed to start bots:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down bots...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down bots...');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
startBots();
