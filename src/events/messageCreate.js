import { getGuild, getAFK, removeAFK, getWhitelistRoles, getCustomAliases } from '../utils/database.js';
import { getAutoResponders } from '../commands/misc/autoresponder.js';
import { err, CV2, COLORS } from '../utils/components.js';
import {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags,
} from 'discord.js';

const S = (size = SeparatorSpacingSize.Small, div = true) =>
  new SeparatorBuilder().setSpacing(size).setDivider(div);

// lazy-loaded so there's no circular dep at startup
let _cmdMeta = null;
async function getCmdMeta() {
  if (!_cmdMeta) {
    const mod = await import('../commands/misc/help.js');
    _cmdMeta = mod.CMD_META;
  }
  return _cmdMeta;
}

function usageCard(meta, prefix, color = 0x5865F2) {
  const block = [
    '```',
    `Syntax:  ${meta.usage}`,
    `Example: ${meta.example}`,
    meta.aliases?.length ? `Aliases: ${meta.aliases.join('  ')}` : null,
    '```',
  ].filter(Boolean).join('\n');

  const c = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${meta.name}\n${meta.desc}`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(block));

  return { flags: CV2, components: [c] };
}

export const name = 'messageCreate';

export async function execute(message, client) {
  if (message.author.bot || !message.guild) return;

  const guildData = getGuild(message.guild.id);
  const prefix = guildData.prefix || '!';

  // ── AFK: remove own AFK ────────────────────────────────────────────────────
  const afk = getAFK(message.author.id, message.guild.id);
  if (afk) {
    removeAFK(message.author.id, message.guild.id);
    const c = new ContainerBuilder().setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `welcome back **${message.author.username}**, your afk was removed`
      ));
    message.reply({ flags: CV2, components: [c] })
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // ── AFK: notify if someone pings an afk user ───────────────────────────────
  for (const mention of message.mentions.users.values()) {
    const afkData = getAFK(mention.id, message.guild.id);
    if (afkData && mention.id !== message.author.id) {
      const c = new ContainerBuilder().setAccentColor(COLORS.yellow)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `💤 **${mention.username}** is afk: ${afkData.reason} — <t:${afkData.set_at}:R>`
        ));
      message.reply({ flags: CV2, components: [c] })
        .then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    }
  }

  // ── auto-responders ────────────────────────────────────────────────────────
  if (!message.content.startsWith(prefix)) {
    const responders = getAutoResponders(message.guild.id);
    if (responders.length) {
      const content = message.content.toLowerCase();
      for (const r of responders) {
        const t = r.trigger;
        const hit = r.match_type === 'exact'      ? content === t
                  : r.match_type === 'startswith' ? content.startsWith(t)
                  :                                 content.includes(t);
        if (hit) { message.reply(r.response).catch(() => {}); break; }
      }
    }
    return;
  }

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return;

  // ── resolve command (built-in alias → custom guild alias → name) ───────────
  let cmdName = client.aliases.get(commandName) || commandName;
  if (!client.commands.has(cmdName)) {
    const customAliases = getCustomAliases(message.guild.id);
    const custom = customAliases.find(a => a.shortcut === commandName);
    if (custom) cmdName = custom.target;
  }

  const cmd = client.commands.get(cmdName);
  if (!cmd?.prefixExecute) return;

  // ── whitelist role check ───────────────────────────────────────────────────
  const wlRoles = getWhitelistRoles(message.guild.id);
  if (wlRoles.length > 0) {
    const isAdmin = message.member?.permissions?.has('Administrator');
    const hasRole = isAdmin || wlRoles.some(r => message.member?.roles?.cache?.has(r));
    if (!hasRole) {
      const c = new ContainerBuilder().setAccentColor(COLORS.red)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `you don't have a whitelisted role to use this bot`
        ));
      return message.reply({ flags: CV2 | (1 << 6), components: [c] });
    }
  }

  // ── usage hint: no args provided ──────────────────────────────────────────
  if (args.length === 0 && cmd.usage) {
    const meta = await getCmdMeta();
    const m = meta[cmdName] || meta[cmd.data?.name];
    if (m) return message.reply(usageCard(m, prefix, m.color || 0x5865F2));
  }

  try {
    await cmd.prefixExecute(message, args, client);
  } catch (e) {
    // Usage hint on thrown UsageError
    if (e?.name === 'UsageError') {
      const meta = await getCmdMeta();
      const m = meta[e.message] || meta[cmdName];
      if (m) return message.reply(usageCard(m, prefix, m.color || 0x5865F2));
    }
    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ ${e.message}`));
    message.reply({ flags: CV2, components: [c] }).catch(() => {});
  }
}
