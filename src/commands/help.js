const { SlashCommandBuilder } = require('discord.js');
const { getPrefix } = require('../utils/database');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  prefix: { name: 'help', aliases: ['h', '?'] },
  usage: 'help',

  async execute(interaction) {
    const prefix = getPrefix(interaction.guild.id);
    return interaction.reply(C.cv2Reply([buildHelp(prefix)], true));
  },

  async prefixExecute(message, args) {
    const prefix = getPrefix(message.guild.id);
    return C.prefixSend(message, [buildHelp(prefix)]);
  }
};

function buildHelp(prefix) {
  return C.container([
    C.textDisplay(
      `**Commands**\n*Slash commands work everywhere. Prefix commands use \`${prefix}\`.*\n`
    ),
    C.separator(),
    C.textDisplay(
      `**Whitelist**\n` +
      `\`${prefix}whitelist add @user [category]\`\n` +
      `\`${prefix}whitelist remove @user [category]\`\n` +
      `\`${prefix}whitelist role @role [category]\`\n` +
      `\`${prefix}whitelist removerole @role [category]\`\n` +
      `\`${prefix}whitelist list\`\n` +
      `*Categories: all, vanity, sniper, tags, tickets, verify*`
    ),
    C.separator(),
    C.textDisplay(
      `**Vanity Watcher**\n` +
      `\`${prefix}vanity add <vanity>\`\n` +
      `\`${prefix}vanity remove <vanity>\`\n` +
      `\`${prefix}vanity list\`\n` +
      `\`${prefix}vanity setchannel #channel\`\n` +
      `\`${prefix}vanity pingrole @role\`\n` +
      `\`${prefix}vanity toggle\``
    ),
    C.separator(),
    C.textDisplay(
      `**Roblox Sniper**\n` +
      `\`${prefix}sniper add <roblox_id> <server_link> [@user]\`\n` +
      `\`${prefix}sniper remove <roblox_id>\`\n` +
      `\`${prefix}sniper list\`\n` +
      `\`${prefix}sniper setchannel #channel\``
    ),
    C.separator(),
    C.textDisplay(
      `**Roblox Tags**\n` +
      `\`${prefix}tag <roblox_user> <tag>\`\n` +
      `*Tags: 164 | KITTY TAG | lurk tag | AMOR TAG | YinYang*\n` +
      `\`${prefix}striptag <roblox_user | @user | everyone>\``
    ),
    C.separator(),
    C.textDisplay(
      `**Verification**\n` +
      `\`${prefix}verify <roblox_username>\`\n` +
      `\`/verify\` — slash only (modal input)`
    ),
    C.separator(),
    C.textDisplay(
      `**Tickets**\n` +
      `\`${prefix}setupticket <verification|tag> [#log_channel]\`\n\n` +
      `**Bot**\n` +
      `\`${prefix}setprefix <prefix>\``
    ),
  ], 0x5865F2);
}
