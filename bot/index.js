import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { startBotServer } from './server.js';
import { registerMudaeListener } from './listeners/mudaeListener.js';
import { syncCommand, handleSyncCommand } from './commands/sync.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async () => {
  console.log(`Bot ready as ${client.user.tag}`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
    { body: [syncCommand.toJSON()] }
  );
  console.log('Slash commands registered');
});

client.on('messageCreate', registerMudaeListener(client));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'sync') await handleSyncCommand(interaction);
});

await client.login(process.env.DISCORD_TOKEN);

startBotServer(client);
