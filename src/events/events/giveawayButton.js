import { getGiveaway, updateGiveaway } from '../utils/database.js';
import { ok, err } from '../utils/components.js';

export async function handleGiveawayEnter(interaction, client) {
  const msgId = interaction.customId.replace('giveaway_enter_', '');
  const gw = getGiveaway(msgId);

  if (!gw || gw.status !== 'active') return interaction.reply(err('this giveaway has ended'));

  const entries = JSON.parse(gw.entries || '[]');

  // toggle entry — click again to leave
  if (entries.includes(interaction.user.id)) {
    entries.splice(entries.indexOf(interaction.user.id), 1);
    updateGiveaway(gw.id, { entries: JSON.stringify(entries) });
    return interaction.reply(ok(`you left the **${gw.prize}** giveaway`));
  }

  entries.push(interaction.user.id);
  updateGiveaway(gw.id, { entries: JSON.stringify(entries) });
  return interaction.reply(ok(`entered **${gw.prize}**! ${entries.length} total entr${entries.length === 1 ? 'y' : 'ies'}`));
}
