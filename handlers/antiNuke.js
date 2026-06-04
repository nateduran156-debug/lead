import { getGuild, recordAntiNukeAction, getAntiNukeActions } from '../utils/database.js';
import { CV2, COLORS } from '../utils/components.js';
import {
  AuditLogEvent, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} from 'discord.js';

// ── defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_MODULES = {
  ban:            true,
  kick:           true,
  channel_delete: true,
  channel_create: true,
  role_delete:    true,
  webhook_create: true,
  emoji_delete:   false,
  perm_grant:     true,
  vanity:         false,
  bot_add:        false,
};

export const DEFAULT_THRESHOLDS = {
  ban:            3,
  kick:           3,
  channel_delete: 3,
  channel_create: 5,
  role_delete:    3,
  webhook_create: 5,
  emoji_delete:   5,
  perm_grant:     2,
};

const DANGEROUS_PERMS = [
  'Administrator', 'BanMembers', 'KickMembers', 'ManageChannels',
  'ManageGuild', 'ManageRoles', 'ManageWebhooks', 'MentionEveryone',
  'ManageMessages', 'DeafenMembers', 'MuteMembers',
];

// ── in-memory fast tracker ────────────────────────────────────────────────────
// avoids a DB round-trip on every audit-log event
const tracker = new Map(); // `guildId:userId:action` → [timestamp_ms, ...]

function track(guildId, userId, action, windowMs) {
  const key = `${guildId}:${userId}:${action}`;
  const now = Date.now();
  const times = (tracker.get(key) || []).filter(t => now - t < windowMs);
  times.push(now);
  tracker.set(key, times);
  return times.length;
}

// clean tracker every 5 min to prevent leaks
setInterval(() => {
  const cutoff = Date.now() - 600_000;
  for (const [k, times] of tracker) {
    if (times.every(t => t < cutoff)) tracker.delete(k);
  }
}, 300_000);

// ── helpers ───────────────────────────────────────────────────────────────────

function parseJson(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

function getConfig(guildId) {
  const g = getGuild(guildId);
  return {
    enabled:      !!g.antinuke_enabled,
    punish:       g.antinuke_punish || 'ban',
    window:       (g.antinuke_window || 10) * 1000,
    logChannel:   g.antinuke_log_channel,
    whitelist:    parseJson(g.antinuke_whitelist, []),
    superAdmins:  parseJson(g.antinuke_super_admins, []),
    wlBots:       parseJson(g.antinuke_whitelisted_bots, []),
    modules:      { ...DEFAULT_MODULES, ...parseJson(g.antinuke_modules, {}) },
    thresholds:   { ...DEFAULT_THRESHOLDS, ...parseJson(g.antinuke_thresholds, {}) },
  };
}

function isBypassed(cfg, userId, isBot = false) {
  if (isBot && cfg.wlBots.includes(userId)) return true;
  return cfg.superAdmins.includes(userId) || cfg.whitelist.includes(userId);
}

async function fetchExecutor(guild, auditEvent, delay = 800) {
  await new Promise(r => setTimeout(r, delay));
  try {
    const logs = await guild.fetchAuditLogs({ limit: 3, type: auditEvent });
    return logs.entries.first()?.executor ?? null;
  } catch { return null; }
}

// ── punishment ────────────────────────────────────────────────────────────────

async function punish(guild, userId, reason, punishType) {
  if (userId === guild.ownerId) return;

  let member = null;
  try { member = await guild.members.fetch(userId); } catch {}

  // 1 — strip roles immediately to halt damage
  if (member) {
    try {
      const bot = guild.members.me;
      const toRemove = member.roles.cache
        .filter(r => r.id !== guild.id && r.position < bot.roles.highest.position)
        .map(r => r.id);
      if (toRemove.length) await member.roles.remove(toRemove, '[AntiNuke] role strip').catch(() => {});
    } catch {}
  }

  // 2 — apply configured punishment
  if (punishType === 'ban') {
    await guild.bans.create(userId, { reason: `[AntiNuke] ${reason}`, deleteMessageSeconds: 86400 }).catch(() => {});
  } else if (punishType === 'kick' && member) {
    await member.kick(`[AntiNuke] ${reason}`).catch(() => {});
  }
  // 'strip' — role removal already done above
}

// ── log ───────────────────────────────────────────────────────────────────────

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

async function log(guild, cfg, { module: mod, executor, count, threshold, extra = '' }) {
  if (!cfg.logChannel) return;
  const ch = guild.channels.cache.get(cfg.logChannel);
  if (!ch) return;

  const c = new ContainerBuilder()
    .setAccentColor(COLORS.red)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## AntiNuke Triggered — ${mod}`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent([
      `executor · ${executor ? `<@${executor.id}> \`${executor.id}\`` : 'unknown'}`,
      `action   · ${count}/${threshold} in window`,
      `punish   · ${cfg.punish}`,
      extra ? `detail   · ${extra}` : null,
    ].filter(Boolean).join('\n')))
    .addSeparatorComponents(S(false))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `-# <t:${Math.floor(Date.now() / 1000)}:T>`
    ));

  ch.send({ flags: CV2, components: [c] }).catch(() => {});
}

// ── core check ────────────────────────────────────────────────────────────────

async function check(guild, executor, action, extra = '') {
  if (!executor) return;
  if (executor.bot) return; // bots handled separately in bot_add

  const cfg = getConfig(guild.id);
  if (!cfg.enabled) return;
  if (!cfg.modules[action]) return;
  if (isBypassed(cfg, executor.id)) return;
  if (executor.id === guild.ownerId) return;

  const threshold = cfg.thresholds[action] ?? DEFAULT_THRESHOLDS[action] ?? 3;
  const count = track(guild.id, executor.id, action, cfg.window);

  // also record to DB for persistence
  recordAntiNukeAction(guild.id, executor.id, action).catch?.(() => {});

  if (count >= threshold) {
    await punish(guild, executor.id, `${action} threshold exceeded (${count}/${threshold})`, cfg.punish);
    await log(guild, cfg, { module: action, executor, count, threshold, extra });
  }
}

// ── listeners ─────────────────────────────────────────────────────────────────

export function setupAntiNukeListeners(client) {

  // ── Mass Ban ────────────────────────────────────────────────────────────────
  client.on('guildBanAdd', async (ban) => {
    const exec = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    if (exec) await check(ban.guild, exec, 'ban', `banned: ${ban.user.tag}`);
  });

  // ── Mass Kick ───────────────────────────────────────────────────────────────
  client.on('guildMemberRemove', async (member) => {
    const exec = await fetchExecutor(member.guild, AuditLogEvent.MemberKick);
    if (exec && exec.id !== member.id)
      await check(member.guild, exec, 'kick', `kicked: ${member.user.tag}`);
  });

  // ── Channel Delete ──────────────────────────────────────────────────────────
  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const exec = await fetchExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (exec) await check(channel.guild, exec, 'channel_delete', `#${channel.name}`);
  });

  // ── Channel Create ──────────────────────────────────────────────────────────
  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const exec = await fetchExecutor(channel.guild, AuditLogEvent.ChannelCreate);
    if (exec) await check(channel.guild, exec, 'channel_create', `#${channel.name}`);
  });

  // ── Role Delete ─────────────────────────────────────────────────────────────
  client.on('roleDelete', async (role) => {
    const exec = await fetchExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (exec) await check(role.guild, exec, 'role_delete', `@${role.name}`);
  });

  // ── Webhook Create ──────────────────────────────────────────────────────────
  client.on('webhookUpdate', async (channel) => {
    if (!channel.guild) return;
    const exec = await fetchExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (exec) await check(channel.guild, exec, 'webhook_create', `#${channel.name}`);
  });

  // ── Emoji Delete ────────────────────────────────────────────────────────────
  client.on('emojiDelete', async (emoji) => {
    const exec = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiDelete);
    if (exec) await check(emoji.guild, exec, 'emoji_delete', emoji.name);
  });

  // ── Dangerous Permission Grant (role update) ────────────────────────────────
  client.on('roleUpdate', async (oldRole, newRole) => {
    const cfg = getConfig(newRole.guild.id);
    if (!cfg.enabled || !cfg.modules.perm_grant) return;

    // check if dangerous perms were ADDED
    const gained = DANGEROUS_PERMS.filter(p => {
      try { return !oldRole.permissions.has(p) && newRole.permissions.has(p); }
      catch { return false; }
    });
    if (!gained.length) return;

    const exec = await fetchExecutor(newRole.guild, AuditLogEvent.RoleUpdate);
    if (exec) await check(newRole.guild, exec, 'perm_grant', `@${newRole.name} gained: ${gained.join(', ')}`);
  });

  // ── Dangerous Role Grant to Member ─────────────────────────────────────────
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const cfg = getConfig(newMember.guild.id);
    if (!cfg.enabled || !cfg.modules.perm_grant) return;

    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    if (!addedRoles.size) return;

    const dangerousRoleAdded = addedRoles.some(r =>
      DANGEROUS_PERMS.some(p => { try { return r.permissions.has(p); } catch { return false; } })
    );
    if (!dangerousRoleAdded) return;

    const exec = await fetchExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate);
    if (exec && exec.id !== newMember.id)
      await check(newMember.guild, exec, 'perm_grant', `gave dangerous role to ${newMember.user.tag}`);
  });

  // ── Vanity URL Protection ───────────────────────────────────────────────────
  client.on('guildUpdate', async (oldGuild, newGuild) => {
    const cfg = getConfig(newGuild.id);
    if (!cfg.enabled || !cfg.modules.vanity) return;
    if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;

    const exec = await fetchExecutor(newGuild, AuditLogEvent.GuildUpdate);
    if (!exec) return;
    if (isBypassed(cfg, exec.id)) return;
    if (exec.id === newGuild.ownerId) return;

    // attempt to restore vanity
    if (oldGuild.vanityURLCode) {
      newGuild.setVanityCode(oldGuild.vanityURLCode, '[AntiNuke] vanity revert').catch(() => {});
    }
    await punish(newGuild, exec.id, 'vanity URL tampered', cfg.punish);
    await log(newGuild, cfg, {
      module: 'vanity',
      executor: exec,
      count: 1,
      threshold: 1,
      extra: `changed from \`${oldGuild.vanityURLCode}\` → \`${newGuild.vanityURLCode}\``,
    });
  });

  // ── Bot Join Protection ─────────────────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot) return;
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled || !cfg.modules.bot_add) return;
    if (cfg.wlBots.includes(member.id)) return;

    const exec = await fetchExecutor(member.guild, AuditLogEvent.BotAdd);
    const reason = `[AntiNuke] unauthorized bot added: ${member.user.tag}`;

    // kick the bot
    await member.kick(reason).catch(() => {});

    // punish whoever added it
    if (exec && exec.id !== member.guild.ownerId && !isBypassed(cfg, exec.id)) {
      await punish(member.guild, exec.id, `added unauthorized bot ${member.user.tag}`, cfg.punish);
      await log(member.guild, cfg, {
        module: 'bot_add',
        executor: exec,
        count: 1,
        threshold: 1,
        extra: `bot: ${member.user.tag} (${member.id})`,
      });
    }
  });
}
