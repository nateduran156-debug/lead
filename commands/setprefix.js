const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setPrefix, getPrefix } = require('../utils/database');
const C = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Change the bot prefix for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('prefix')
        .setDescription('New prefix (1–5 characters)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(5)
    ),

  prefix: { name: 'setprefix', aliases: ['prefix'] },
  usage: 'setprefix <new_prefix>',

  async execute(interaction) {
    const prefix = interaction.options.getString('prefix');
    setPrefix(interaction.guild.id, prefix);
    return interaction.reply(C.cv2Reply([
      C.container([C.textDisplay(`Bot prefix updated to \`${prefix}\``)], 0x57F287)
    ], true));
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== require('../utils/constants').OWNER_ID) {
      return C.prefixSend(message, [C.container([C.textDisplay('You need Administrator permission to change the prefix.')], 0xED4245)]);
    }
    const newPrefix = args[0];
    if (!newPrefix || newPrefix.length > 5) {
      return C.prefixSend(message, [C.container([C.textDisplay('Usage: `!setprefix <new_prefix>` (1–5 characters)')], 0xFEE75C)]);
    }
    setPrefix(message.guild.id, newPrefix);
    return C.prefixSend(message, [C.container([C.textDisplay(`Bot prefix updated to \`${newPrefix}\``)], 0x57F287)]);
  }
};
