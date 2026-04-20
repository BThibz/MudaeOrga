import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const syncCommand = new SlashCommandBuilder()
  .setName('sync')
  .setDescription('Force la synchronisation du harem Mudae vers la base de données');

export async function handleSyncCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${BACKEND_URL}/api/sync/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: interaction.user.id,
        channelId: interaction.channelId,
      }),
    });

    if (res.ok) {
      await interaction.editReply(
        '✅ Synchronisation déclenchée. Lance `$mm` dans le channel pour démarrer la lecture du harem.'
      );
    } else {
      await interaction.editReply('❌ Erreur lors du déclenchement de la synchronisation.');
    }
  } catch (err) {
    await interaction.editReply(`❌ Erreur réseau : ${err.message}`);
  }
}
