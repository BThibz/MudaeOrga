'use strict';

/**
 * Register the interactionCreate listener (handles slash commands).
 *
 * @param {import('discord.js').Client} client
 * @param {Map<string, import('../services/syncSession').SyncSession>} activeSessions
 */
function register(client, activeSessions) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[interactionCreate] Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, activeSessions);
    } catch (err) {
      console.error(`[interactionCreate] Error executing /${interaction.commandName}:`, err);
      const reply = { content: 'Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });
}

module.exports = { register };
