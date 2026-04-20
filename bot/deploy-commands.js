'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const syncCommand = require('./commands/sync');

const commands = [syncCommand.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!clientId || !guildId) {
    console.error('DISCORD_CLIENT_ID and GUILD_ID must be set in .env');
    process.exit(1);
  }

  try {
    console.log(`Registering ${commands.length} slash command(s)…`);
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log(`Successfully registered ${data.length} command(s).`);
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
