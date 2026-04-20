'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { SyncSession } = require('../services/syncSession');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Synchronise ton harem Mudae vers le backend MudaeOrga'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Map<string, SyncSession>} activeSessions  keyed by channelId
   */
  async execute(interaction, activeSessions) {
    const channelId = interaction.channelId;
    const targetChannelId = process.env.CHANNEL_ID;

    if (targetChannelId && channelId !== targetChannelId) {
      await interaction.reply({
        content: `Utilise cette commande dans le channel Mudae configuré (<#${targetChannelId}>).`,
        ephemeral: true,
      });
      return;
    }

    if (activeSessions.has(channelId)) {
      await interaction.reply({
        content: 'Une synchronisation est déjà en cours dans ce channel. Attends qu\'elle se termine.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(
      'Synchronisation démarrée… Lance `$mm` dans Mudae et fais défiler toutes les pages. ' +
      'Le bot collecte automatiquement les données.'
    );

    const session = new SyncSession(interaction);
    activeSessions.set(channelId, session);

    // Clean up the session map once it finishes
    const originalFinalize = session.finalize.bind(session);
    session.finalize = async function () {
      activeSessions.delete(channelId);
      return originalFinalize();
    };
  },
};
