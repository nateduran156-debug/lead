import db, { getGiveaway, updateGiveaway } from '../utils/database.js';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

export function startGiveawayLoop(client) {
  setInterval(() => checkGiveaways(client), 15000);
}

async function checkGiveaways(client) {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.prepare("SELECT * FROM giveaways WHERE status = 'active' AND ends_at <= ?").all(now);
  for (const gw of expired) await endGiveaway(client, gw);
}

export async function endGiveaway(client, giveaway) {
  updateGiveaway(giveaway.id, { status: 'ended', ended_at: Math.floor(Date.now() / 1000) });

  const entries = JSON.parse(giveaway.entries || '[]');
  const count = Math.min(giveaway.winners, entries.length);
  const winners = [...entries].sort(() => Math.random() - 0.5).slice(0, count);
  updateGiveaway(giveaway.id, { winner_ids: JSON.stringify(winners) });

  try {
    const ch = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!ch) return;

    if (giveaway.message_id) {
      const msg = await ch.messages.fetch(giveaway.message_id).catch(() => null);
      if (msg) {
        const c = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## 🎉 giveaway ended — ${giveaway.prize}\n` +
            (winners.length ? `**winners** ${winners.map(w => `<@${w}>`).join(', ')}` : 'no valid entries')
          ));
        await msg.edit({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => {});
      }
    }

    const text = winners.length
      ? `🎉 congrats ${winners.map(w => `<@${w}>`).join(', ')}! you won **${giveaway.prize}**`
      : `😔 nobody entered the **${giveaway.prize}** giveaway`;
    await ch.send({ content: text });
  } catch (e) {
    console.error('giveaway end error:', e.message);
  }
}
