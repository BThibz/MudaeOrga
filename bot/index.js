'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const messageCreate = require('./listeners/messageCreate');
const interactionCreate = require('./listeners/interactionCreate');
const syncCommand = require('./commands/sync');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Slash command registry
client.commands = new Collection();
client.commands.set(syncCommand.data.name, syncCommand);

// Active sync sessions, keyed by channelId
const activeSessions = new Map();

// Register event listeners
messageCreate.register(client, activeSessions);
interactionCreate.register(client, activeSessions);

client.once('ready', () => {
  console.log(`[Bot] Connected as ${client.user.tag}`);
  console.log(`[Bot] Backend URL: ${process.env.BACKEND_URL || 'http://localhost:3001'}`);
});

client.on('error', (err) => {
  console.error('[Bot] Discord client error:', err);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Bot] DISCORD_TOKEN is not set. Copy .env.example to .env and fill in your token.');
  process.exit(1);
}

client.login(token);
