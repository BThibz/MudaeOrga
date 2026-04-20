import PQueue from 'p-queue';
import fetch from 'node-fetch';

const MUDAE_ID = '432610292342587392';

// jobId -> { queue: PQueue, cancelled: boolean }
const activeJobs = new Map();

export async function startDiscordSync(client, { jobId, moves, channelId }) {
  const targetChannelId = channelId || process.env.CHANNEL_ID;
  let channel;
  try {
    channel = await client.channels.fetch(targetChannelId);
  } catch {
    await reportProgress(jobId, { status: 'error', error: 'Channel not found or inaccessible' });
    return;
  }

  // 1 command every 4 seconds to stay under Mudae's rate limit
  const queue = new PQueue({ concurrency: 1, interval: 4_000, intervalCap: 1 });
  const job = { queue, cancelled: false };
  activeJobs.set(jobId, job);

  let completed = 0;
  const total = moves.length;

  await reportProgress(jobId, { status: 'started', completed: 0, total });

  for (const move of moves) {
    if (job.cancelled) break;

    queue.add(async () => {
      if (job.cancelled) return;

      try {
        await channel.send(`$mmso ${move.name} ${move.slot}`);

        const confirmed = await waitForMudaeConfirmation(client, channel.id, move.name, 6_000);

        if (!confirmed) {
          job.cancelled = true;
          queue.clear();
          await reportProgress(jobId, {
            status: 'error',
            error: `Mudae did not confirm move for "${move.name}" — possible cooldown`,
            completed,
            total,
          });
          activeJobs.delete(jobId);
          return;
        }

        completed++;
        await reportProgress(jobId, {
          status: 'progress',
          completed,
          total,
          currentMove: move,
        });
      } catch (err) {
        job.cancelled = true;
        queue.clear();
        await reportProgress(jobId, { status: 'error', error: err.message, completed, total });
        activeJobs.delete(jobId);
      }
    });
  }

  await queue.onIdle();

  if (!job.cancelled) {
    await reportProgress(jobId, { status: 'completed', completed, total });
    activeJobs.delete(jobId);
  }
}

export function cancelDiscordSync(jobId) {
  const job = activeJobs.get(jobId);
  if (!job) return;
  job.cancelled = true;
  job.queue.clear();
  activeJobs.delete(jobId);
}

function waitForMudaeConfirmation(client, channelId, characterName, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.off('messageCreate', handler);
      resolve(false);
    }, timeoutMs);

    function handler(message) {
      if (
        message.channelId === channelId &&
        message.author.id === MUDAE_ID &&
        message.content.toLowerCase().includes(characterName.toLowerCase())
      ) {
        clearTimeout(timer);
        client.off('messageCreate', handler);
        resolve(true);
      }
    }

    client.on('messageCreate', handler);
  });
}

async function reportProgress(jobId, data) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const BOT_SECRET = process.env.BOT_SERVER_SECRET || 'changeme';
  try {
    await fetch(`${BACKEND_URL}/api/discord-sync/${jobId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET,
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error(`[discord-sync] Failed to report progress for job ${jobId}:`, err.message);
  }
}
