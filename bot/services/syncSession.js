'use strict';

const { parseMudaeEmbed, parsePagination } = require('../parsers/mudaeEmbed');
const { syncCharacters } = require('./backendApi');

const COLLECT_TIMEOUT_MS = 60_000;

/**
 * Manages one active sync session.
 *
 * Lifecycle:
 *   1. Created when the user runs /sync.
 *   2. addMessage() is called for each Mudae message received in the channel.
 *   3. When the last page is detected (or the timeout fires), finalize() is
 *      called automatically: data is POSTed to the backend and the interaction
 *      is updated with a summary.
 */
class SyncSession {
  constructor(interaction) {
    this.interaction = interaction;
    this.channelId = interaction.channelId;

    // Deduplicated by character name (last write wins for the same name)
    this.characters = new Map();

    this.totalPages = null;
    this.pagesReceived = new Set();
    this.finished = false;

    this._timeout = setTimeout(() => this._onTimeout(), COLLECT_TIMEOUT_MS);
  }

  /**
   * Feed a Discord message into this session.
   * Returns true if the session is now complete.
   * @param {import('discord.js').Message} message
   */
  addMessage(message) {
    if (this.finished) return false;
    if (message.channelId !== this.channelId) return false;

    let sessionComplete = false;

    for (const embed of message.embeds) {
      const character = parseMudaeEmbed(embed);
      if (!character) continue;

      this.characters.set(character.name, character);

      const pagination = parsePagination(embed.footer?.text || '');
      if (pagination) {
        this.pagesReceived.add(pagination.current);
        if (this.totalPages === null) {
          this.totalPages = pagination.total;
        }
        if (this.pagesReceived.size >= this.totalPages) {
          sessionComplete = true;
        }
      }
    }

    if (sessionComplete) {
      this.finalize();
    }

    return sessionComplete;
  }

  async finalize() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this._timeout);

    const characters = Array.from(this.characters.values());

    try {
      const result = await syncCharacters(characters);
      const synced = result?.synced ?? characters.length;
      await this.interaction.editReply(
        `Synchronisation terminée : **${synced}** personnage(s) envoyé(s) au backend.`
      );
    } catch (err) {
      console.error('[SyncSession] Backend sync failed:', err.message);
      await this.interaction.editReply(
        `Erreur lors de la synchronisation : ${err.message}`
      );
    }
  }

  _onTimeout() {
    if (this.finished) return;
    console.warn('[SyncSession] Timeout reached, finalizing with partial data.');
    this.finalize();
  }

  cancel() {
    this.finished = true;
    clearTimeout(this._timeout);
  }
}

module.exports = { SyncSession };
