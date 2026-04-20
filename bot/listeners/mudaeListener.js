import fetch from 'node-fetch';
import { parseHaremEmbed, isHaremEmbed } from '../utils/mudaeParser.js';

const MUDAE_ID = '432610292342587392';
const SESSION_TIMEOUT_MS = 30_000;

// channelId -> { characters[], lastActivity }
const syncSessions = new Map();

export function registerMudaeListener(client) {
  return async function onMessage(message) {
    if (message.author.id !== MUDAE_ID) return;
    if (!message.embeds.length) return;

    const key = message.channelId;
    let session = syncSessions.get(key);

    for (const embed of message.embeds) {
      if (!isHaremEmbed(embed)) continue;
      const character = parseHaremEmbed(embed);
      if (!character) continue;

      if (!session) {
        session = { characters: [], lastActivity: Date.now() };
        syncSessions.set(key, session);
      }

      session.lastActivity = Date.now();
      if (!session.characters.find((c) => c.name === character.name)) {
        session.characters.push(character);
      }
    }

    // If there's no "next page" button, this is the last page — flush
    const hasNextButton = message.components.some((row) =>
      row.components?.some(
        (c) => c.label === '▶' || c.customId?.includes('next')
      )
    );

    if (!hasNextButton && session?.characters.length) {
      await flushSession(key);
    }
  };
}

async function flushSession(key) {
  const session = syncSessions.get(key);
  if (!session || !session.characters.length) return;
  syncSessions.delete(key);

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${BACKEND_URL}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': process.env.BOT_SERVER_SECRET || 'changeme',
      },
      body: JSON.stringify({ characters: session.characters }),
    });
    if (!res.ok) {
      console.error('Failed to sync to backend:', await res.text());
    } else {
      console.log(`Synced ${session.characters.length} characters to backend`);
    }
  } catch (err) {
    console.error('Network error syncing to backend:', err.message);
  }
}

// Flush stale sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of syncSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      flushSession(key);
    }
  }
}, SESSION_TIMEOUT_MS);
