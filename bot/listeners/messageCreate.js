'use strict';

const { isMudaeMessage } = require('../parsers/mudaeEmbed');

/**
 * Register the messageCreate listener.
 * For each Mudae message, feed it into any active SyncSession for that channel.
 *
 * @param {import('discord.js').Client} client
 * @param {Map<string, import('../services/syncSession').SyncSession>} activeSessions
 */
function register(client, activeSessions) {
  client.on('messageCreate', (message) => {
    if (!isMudaeMessage(message)) return;
    if (message.embeds.length === 0) return;

    const session = activeSessions.get(message.channelId);
    if (!session) return;

    const done = session.addMessage(message);
    if (done) {
      console.log(`[messageCreate] Session for channel ${message.channelId} completed.`);
    }
  });
}

module.exports = { register };
