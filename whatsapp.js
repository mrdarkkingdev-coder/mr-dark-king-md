const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, isJidBroadcast } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import commands (with fallback if files don't exist yet)
let menu, owner, ping;
try {
    menu = require('./commands/menu.js');
    owner = require('./commands/owner.js');
    ping = require('./commands/ping.js');
} catch (e) {
    console.warn('⚠️  Warning: Command files not found, basic commands only available');
}

const BOT_NAME = "MR DARK KING MD";
let botMode = process.env.BOT_MODE || 'private';
const OWNER_NUMBER = process.env.BOT_OWNER_PHONE;
const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8LXbO6LwHkS1PGWV1E";
const CHANNEL_ID = "0029Vb8LXbO6LwHkS1PGWV1E@newsletter";

let sock;

const startWhatsAppBot = async () => {
    try {
        // Create auth directory if it doesn't exist
        if (!fs.existsSync('auth_info_baileys')) {
            fs.mkdirSync('auth_info_baileys', { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: { level: 'silent' },
            browser: ["Chrome", "120", "1"],
            syncFullHistory: false
        });

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if(qr) {
                console.log('📱 Scan QR Code with WhatsApp to authenticate');
            }
            
            if(connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
                
                if(shouldReconnect) {
                    setTimeout(() => startWhatsAppBot(), 3000);
                }
            } else if(connection === 'open') {
                console.log(`✅ ${BOT_NAME} WhatsApp Bot Connected!`);
            }
        });

        // Save credentials
        sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        sock.ev.on('messages.upsert', async (m) => {
            if (!sock) return;
            
            try {
                const msg = m.messages[0];
                
                if(!msg.message) return;
                if(msg.key.fromMe) return;
                if(isJidBroadcast(msg.key.remoteJid)) return;

                const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
                const senderNumber = msg.key.remoteJid;
                
                // Check bot mode
                if(botMode === 'private' && !senderNumber.includes(OWNER_NUMBER)) {
                    return;
                }

                // Command routing
                if(text === '.menu') {
                    if (menu) {
                        await menu.executeWhatsApp(sock, msg);
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: '📋 *Main Menu*\n\n.owner - Owner Info\n.ping - Check Status\n.channel - Join Channel' });
                    }
                } else if(text === '.owner') {
                    if (owner) {
                        await owner.executeWhatsApp(sock, msg);
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Owner:* ${process.env.BOT_OWNER || 'Mr Dark King Dev'}\n☎️ ${process.env.BOT_OWNER_PHONE}` });
                    }
                } else if(text === '.ping') {
                    if (ping) {
                        await ping.executeWhatsApp(sock, msg);
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong! Bot is online!' });
                    }
                } else if(text === '.status') {
                    const statusText = `👑 Bot: Online\nMode: ${botMode}\nOwner: ${process.env.BOT_OWNER}`;
                    await sock.sendMessage(msg.key.remoteJid, { text: statusText });
                } else if(text.startsWith('.pair ')) {
                    const number = text.split(' ')[1];
                    if(!number) {
                        await sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .pair 2348012345678' });
                        return;
                    }
                    
                    try {
                        const code = await sock.requestPairingCode(number);
                        console.log(`\n👑 PAIR CODE: ${code}\n`);
                        
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: `👑 Pair Code: ${code}\n\nEnter this code in WhatsApp:\nSettings → Linked Devices → Link with Phone Number\n\n✅ You will be automatically added to our channel.`
                        });

                        // Automatically add user to channel after pairing
                        setTimeout(async () => {
                            try {
                                await addUserToChannel(number);
                                console.log(`✅ User ${number} added to channel`);
                                await sock.sendMessage(msg.key.remoteJid, { 
                                    text: `✅ Welcome! You've been added to our WhatsApp channel:\n${CHANNEL_URL}` 
                                });
                            } catch (error) {
                                console.log(`Channel invite sent to ${number}:`, error.message);
                                await sock.sendMessage(msg.key.remoteJid, { 
                                    text: `📱 Join our channel here:\n${CHANNEL_URL}` 
                                });
                            }
                        }, 2000);

                    } catch (error) {
                        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` });
                    }
                } else if(text === '.channel') {
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `📱 *Join Our Channel*\n\n${CHANNEL_URL}\n\nStay updated with latest news and updates!` 
                    });
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        return sock;
    } catch (error) {
        console.error('Error starting WhatsApp bot:', error);
        throw error;
    }
};

// Function to add user to channel
const addUserToChannel = async (phoneNumber) => {
    try {
        if (!sock) throw new Error('Socket not initialized');
        
        // Format the phone number to JID
        const jid = phoneNumber.replace(/\D/g, '') + '@s.whatsapp.net';
        
        // Try to add member to newsletter channel
        await sock.groupParticipantsUpdate(CHANNEL_ID, [jid], 'add');
        return true;
    } catch (error) {
        throw error;
    }
};

// Start the bot
startWhatsAppBot().catch(err => {
    console.error('Failed to start WhatsApp bot:', err);
    process.exit(1);
});

module.exports = { startWhatsAppBot, botMode, CHANNEL_URL };
