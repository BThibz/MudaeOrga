export function parseHaremEmbed(embed) {
  if (!embed?.title) return null;

  const name = embed.title.trim();
  const description = embed.description || '';

  // First non-empty line of description = series name
  const series = description.split('\n').map((l) => l.trim()).find(Boolean) || '';

  const kakeraMatch = description.match(/💎\s*(\d+)|(\d+)\s*kakera/i);
  const kakera = kakeraMatch ? parseInt(kakeraMatch[1] ?? kakeraMatch[2], 10) : 0;

  const likesMatch = description.match(/❤️\s*(\d+)/);
  const likes = likesMatch ? parseInt(likesMatch[1], 10) : 0;

  const image_url = embed.thumbnail?.url ?? embed.image?.url ?? null;

  const footerText = embed.footer?.text || '';
  const rankMatch = footerText.match(/(\d+)\s*\/\s*\d+/);
  const rank = rankMatch ? parseInt(rankMatch[1], 10) : null;

  return { name, series, kakera, image_url, rank, likes };
}

export function isHaremEmbed(embed) {
  return Boolean(embed?.title && embed.description !== undefined);
}
