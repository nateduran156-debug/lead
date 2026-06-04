import { getGuild } from './database.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';

const CV2 = MessageFlags.IsComponentsV2;

const TYPE_CHANNEL = {
  join:     g => g.log_join     || g.log_channel,
  leave:    g => g.log_leave    || g.log_channel,
  messages: g => g.log_messages || g.log_channel,
  voice:    g => g.log_voice    || g.log_channel,
  roles:    g => g.log_roles    || g.log_channel,
  mod:      g => g.mod_log_channel || g.log_channel,
};

export function getLogChannel(guild, eventType) {
  const g = getGuild(guild.id);
  const fn = TYPE_CHANNEL[eventType];
  const channelId = fn ? fn(g) : g.log_channel;
  return channelId ? guild.channels.cache.get(channelId) : null;
}

export async function sendLog(guild, eventType, { color = 0x2B2D31, content }) {
  const ch = getLogChannel(guild, eventType);
  if (!ch) return;
  const c = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  ch.send({ flags: CV2, components: [c] }).catch(() => {});
}
