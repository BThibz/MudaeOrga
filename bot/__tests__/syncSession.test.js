'use strict';

jest.mock('../services/backendApi', () => ({
  syncCharacters: jest.fn(),
}));

const { syncCharacters } = require('../services/backendApi');
const { SyncSession } = require('../services/syncSession');

function makeEmbed({ name, description, footer, image } = {}) {
  return {
    author: name ? { name } : undefined,
    description: description || '',
    footer: footer ? { text: footer } : undefined,
    image: image ? { url: image } : undefined,
    thumbnail: undefined,
  };
}

function makeMudaeMessage(embeds, channelId = 'ch1') {
  return {
    author: { id: '432610292342587392' },
    channelId,
    embeds,
  };
}

function makeInteraction(channelId = 'ch1') {
  return {
    channelId,
    editReply: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SyncSession', () => {
  test('collects characters from incoming messages', () => {
    const interaction = makeInteraction();
    const session = new SyncSession(interaction);

    const msg = makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 250 ❤️ 12', footer: '1 / 3 ・ $mm' }),
    ]);

    const done = session.addMessage(msg);
    expect(done).toBe(false);
    expect(session.characters.size).toBe(1);
    session.cancel();
  });

  test('finalizes when all pages received', async () => {
    syncCharacters.mockResolvedValue({ synced: 2 });
    const interaction = makeInteraction();
    const session = new SyncSession(interaction);

    // Total = 2, so send 2 pages
    session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 250', footer: '1 / 2 ・ $mm' }),
    ]));

    const done = session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Zero Two', description: '**Darling in FranXX**\n🌸 300', footer: '2 / 2 ・ $mm' }),
    ]));

    expect(done).toBe(true);
    // Allow async finalize to complete
    await Promise.resolve();
    await Promise.resolve();

    expect(syncCharacters).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Rem' }),
        expect.objectContaining({ name: 'Zero Two' }),
      ])
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('2')
    );
  });

  test('deduplicates characters by name', () => {
    const interaction = makeInteraction();
    const session = new SyncSession(interaction);

    session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 250', footer: '1 / 5' }),
    ]));
    session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 260', footer: '2 / 5' }),
    ]));

    // Last value wins
    expect(session.characters.get('Rem').kakera).toBe(260);
    session.cancel();
  });

  test('ignores messages from other channels', () => {
    const interaction = makeInteraction('ch1');
    const session = new SyncSession(interaction);

    session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 250', footer: '1 / 2' }),
    ], 'ch2')); // different channel

    expect(session.characters.size).toBe(0);
    session.cancel();
  });

  test('finalizes with partial data on timeout', async () => {
    syncCharacters.mockResolvedValue({ synced: 1 });
    const interaction = makeInteraction();
    const session = new SyncSession(interaction);

    session.addMessage(makeMudaeMessage([
      makeEmbed({ name: 'Rem', description: '**Re:Zero**\n🌸 250', footer: '1 / 10 ・ $mm' }),
    ]));

    // Advance fake timers past the 60s timeout
    jest.advanceTimersByTime(61_000);

    await Promise.resolve();
    await Promise.resolve();

    expect(syncCharacters).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalled();
  });
});
