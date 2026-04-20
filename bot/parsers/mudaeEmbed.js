'use strict';

const MUDAE_USER_ID = '432610292342587392';

/**
 * Check if a message was sent by the Mudae bot.
 * @param {import('discord.js').Message} message
 */
function isMudaeMessage(message) {
  return message.author?.id === MUDAE_USER_ID;
}

/**
 * Check if an embed looks like a harem character embed ($mm / $mmi / $mmk).
 * Mudae harem embeds always have an author.name (character name) and a description
 * that starts with a bold series name.
 * @param {import('discord.js').Embed} embed
 */
function isHaremEmbed(embed) {
  if (!embed) return false;
  const hasAuthor = Boolean(embed.author?.name);
  const hasDescription = typeof embed.description === 'string' && embed.description.length > 0;
  return hasAuthor && hasDescription;
}

/**
 * Extract pagination info from a Mudae footer like "3 / 150 ・ $mm".
 * @param {string} footerText
 * @returns {{ current: number, total: number } | null}
 */
function parsePagination(footerText) {
  if (!footerText) return null;
  const match = footerText.match(/(\d+)\s*[\/・]\s*(\d+)/);
  if (!match) return null;
  return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
}

/**
 * Parse a single Mudae harem embed into a normalized character object.
 * Returns null if the embed cannot be parsed.
 *
 * @param {import('discord.js').Embed} embed
 * @returns {{
 *   name: string,
 *   series: string | null,
 *   kakera: number | null,
 *   image_url: string | null,
 *   rank: number | null,
 *   likes: number | null
 * } | null}
 */
function parseMudaeEmbed(embed) {
  if (!isHaremEmbed(embed)) return null;

  const name = embed.author.name.trim();
  const description = embed.description || '';

  // Series: first **bold** segment in the description
  const seriesMatch = description.match(/\*\*(.+?)\*\*/);
  const series = seriesMatch ? seriesMatch[1].trim() : null;

  // Kakera value: 🌸 followed by a number (may have spaces or separators around it)
  const kakeraMatch = description.match(/🌸\s*(\d+)/);
  const kakera = kakeraMatch ? parseInt(kakeraMatch[1], 10) : null;

  // Likes: ❤️ or ♥ followed by a number
  const likesMatch = description.match(/(?:❤️|♥)\s*(\d+)/);
  const likes = likesMatch ? parseInt(likesMatch[1], 10) : null;

  // Rank / position: comes from footer pagination (current page = character rank)
  const pagination = parsePagination(embed.footer?.text || '');
  const rank = pagination ? pagination.current : null;

  // Image: prefer embed.image, fall back to thumbnail
  const image_url = embed.image?.url || embed.thumbnail?.url || null;

  return { name, series, kakera, image_url, rank, likes };
}

/**
 * Parse all harem embeds from a Mudae message.
 * A single message may contain multiple embeds.
 * @param {import('discord.js').Message} message
 * @returns {Array<{ name: string, series: string|null, kakera: number|null, image_url: string|null, rank: number|null, likes: number|null }>}
 */
function parseMudaeMessage(message) {
  if (!isMudaeMessage(message)) return [];
  return message.embeds
    .map((embed) => parseMudaeEmbed(embed))
    .filter(Boolean);
}

module.exports = {
  MUDAE_USER_ID,
  isMudaeMessage,
  isHaremEmbed,
  parsePagination,
  parseMudaeEmbed,
  parseMudaeMessage,
};
