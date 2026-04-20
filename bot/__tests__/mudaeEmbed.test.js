'use strict';

const {
  isMudaeMessage,
  isHaremEmbed,
  parsePagination,
  parseMudaeEmbed,
  parseMudaeMessage,
  MUDAE_USER_ID,
} = require('../parsers/mudaeEmbed');

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeEmbed({ author, description, image, thumbnail, footer } = {}) {
  return { author, description, image, thumbnail, footer };
}

function makeMessage(authorId, embeds = []) {
  return { author: { id: authorId }, embeds, channelId: 'ch1' };
}

// ─── isMudaeMessage ─────────────────────────────────────────────────────────

describe('isMudaeMessage', () => {
  test('returns true for a message from Mudae user ID', () => {
    expect(isMudaeMessage(makeMessage(MUDAE_USER_ID))).toBe(true);
  });

  test('returns false for any other user', () => {
    expect(isMudaeMessage(makeMessage('123456789'))).toBe(false);
  });

  test('returns false when author is missing', () => {
    expect(isMudaeMessage({ embeds: [] })).toBe(false);
  });
});

// ─── isHaremEmbed ───────────────────────────────────────────────────────────

describe('isHaremEmbed', () => {
  test('returns true when embed has author.name and description', () => {
    const embed = makeEmbed({
      author: { name: 'Rem' },
      description: '**Re:Zero**\n🌸 250',
    });
    expect(isHaremEmbed(embed)).toBe(true);
  });

  test('returns false when embed is null', () => {
    expect(isHaremEmbed(null)).toBe(false);
  });

  test('returns false when author.name is missing', () => {
    const embed = makeEmbed({ description: '**Re:Zero**\n🌸 250' });
    expect(isHaremEmbed(embed)).toBe(false);
  });

  test('returns false when description is missing', () => {
    const embed = makeEmbed({ author: { name: 'Rem' } });
    expect(isHaremEmbed(embed)).toBe(false);
  });
});

// ─── parsePagination ────────────────────────────────────────────────────────

describe('parsePagination', () => {
  test('parses "3 / 150 ・ $mm" correctly', () => {
    expect(parsePagination('3 / 150 ・ $mm')).toEqual({ current: 3, total: 150 });
  });

  test('parses "1/50" without spaces', () => {
    expect(parsePagination('1/50')).toEqual({ current: 1, total: 50 });
  });

  test('returns null for empty string', () => {
    expect(parsePagination('')).toBeNull();
  });

  test('returns null when no numbers found', () => {
    expect(parsePagination('$mm')).toBeNull();
  });
});

// ─── parseMudaeEmbed ────────────────────────────────────────────────────────

describe('parseMudaeEmbed', () => {
  const fullEmbed = makeEmbed({
    author: { name: 'Rem' },
    description: '**Re:Zero kara Hajimeru Isekai Seikatsu**\n🌸 250 ❤️ 12',
    image: { url: 'https://i.imgur.com/rem.jpg' },
    footer: { text: '1 / 150 ・ $mm' },
  });

  test('parses a full embed correctly', () => {
    expect(parseMudaeEmbed(fullEmbed)).toEqual({
      name: 'Rem',
      series: 'Re:Zero kara Hajimeru Isekai Seikatsu',
      kakera: 250,
      image_url: 'https://i.imgur.com/rem.jpg',
      rank: 1,
      likes: 12,
    });
  });

  test('returns null for non-harem embed (no author)', () => {
    const embed = makeEmbed({ description: 'Some system message' });
    expect(parseMudaeEmbed(embed)).toBeNull();
  });

  test('returns null for null input', () => {
    expect(parseMudaeEmbed(null)).toBeNull();
  });

  test('handles missing kakera gracefully', () => {
    const embed = makeEmbed({
      author: { name: 'Zero Two' },
      description: '**Darling in the FranXX**\n❤️ 5',
      footer: { text: '2 / 100 ・ $mm' },
    });
    const result = parseMudaeEmbed(embed);
    expect(result.kakera).toBeNull();
    expect(result.likes).toBe(5);
  });

  test('handles missing likes gracefully', () => {
    const embed = makeEmbed({
      author: { name: 'Asuna' },
      description: '**Sword Art Online**\n🌸 300',
      footer: { text: '5 / 80' },
    });
    const result = parseMudaeEmbed(embed);
    expect(result.likes).toBeNull();
    expect(result.kakera).toBe(300);
  });

  test('falls back to thumbnail when no image', () => {
    const embed = makeEmbed({
      author: { name: 'Miku' },
      description: '**Quintessential Quintuplets**\n🌸 200 ❤️ 8',
      thumbnail: { url: 'https://i.imgur.com/miku.jpg' },
      footer: { text: '10 / 200 ・ $mm' },
    });
    expect(parseMudaeEmbed(embed).image_url).toBe('https://i.imgur.com/miku.jpg');
  });

  test('rank is null when footer has no pagination', () => {
    const embed = makeEmbed({
      author: { name: 'Aqua' },
      description: '**KonoSuba**\n🌸 180',
    });
    expect(parseMudaeEmbed(embed).rank).toBeNull();
  });
});

// ─── parseMudaeMessage ──────────────────────────────────────────────────────

describe('parseMudaeMessage', () => {
  test('parses embeds from a Mudae message', () => {
    const embed = makeEmbed({
      author: { name: 'Rem' },
      description: '**Re:Zero**\n🌸 250 ❤️ 12',
      image: { url: 'https://i.imgur.com/rem.jpg' },
      footer: { text: '1 / 150 ・ $mm' },
    });
    const message = makeMessage(MUDAE_USER_ID, [embed]);
    const result = parseMudaeMessage(message);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rem');
  });

  test('returns empty array for non-Mudae message', () => {
    const embed = makeEmbed({
      author: { name: 'Rem' },
      description: '**Re:Zero**\n🌸 250',
    });
    const message = makeMessage('999', [embed]);
    expect(parseMudaeMessage(message)).toEqual([]);
  });

  test('filters out non-harem embeds', () => {
    const goodEmbed = makeEmbed({
      author: { name: 'Rem' },
      description: '**Re:Zero**\n🌸 250',
      footer: { text: '1 / 10' },
    });
    const badEmbed = makeEmbed({ description: 'Not a character' });
    const message = makeMessage(MUDAE_USER_ID, [goodEmbed, badEmbed]);
    expect(parseMudaeMessage(message)).toHaveLength(1);
  });

  test('returns empty array when message has no embeds', () => {
    const message = makeMessage(MUDAE_USER_ID, []);
    expect(parseMudaeMessage(message)).toEqual([]);
  });
});
