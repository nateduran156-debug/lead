const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setPrefix } = require('../utils/database');
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
    return interaction.reply(C.ok(`Bot prefix updated to \`${prefix}\``, true));
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== require('../utils/constants').OWNER_ID) {
      return C.prefixErr(message, 'You need Administrator permission to change the prefix.');
    }
    const newPrefix = args[0];
    if (!newPrefix || newPrefix.length > 5) {
      return message.reply(C.commandCard({
        name: 'setprefix',
        description: 'Change the bot prefix for this server.',
        syntax: `.setprefix <prefix>`,
        example: `.setprefix !`,
        aliases: ['prefix'],
      }));
    }
    setPrefix(message.guild.id, newPrefix);
    return C.prefixOk(message, `Bot prefix updated to \`${newPrefix}\``);
  }
};
