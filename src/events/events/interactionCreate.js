import { err } from '../utils/components.js';
import { getWhitelistRoles } from '../utils/database.js';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

const CV2 = MessageFlags.IsComponentsV2;

export const name = 'interactionCreate';

export async function execute(interaction, client) {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    // ── whitelist role check ─────────────────────────────────────────────────
    if (interaction.guild) {
      const wlRoles = getWhitelistRoles(interaction.guild.id);
      if (wlRoles.length > 0) {
        const isAdmin = interaction.memberPermissions?.has('Administrator');
        const hasRole = isAdmin || wlRoles.some(r => interaction.member?.roles?.cache?.has(r));
        if (!hasRole) {
          const c = new ContainerBuilder().setAccentColor(0xED4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `you don't have a whitelisted role to use this bot`
            ));
          return interaction.reply({ flags: CV2 | (1 << 6), components: [c] });
        }
      }
    }

    try {
      await cmd.execute(interaction, client);
    } catch (e) {
      const msg = err(`something went wrong: ${e.message}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('giveaway_enter_')) {
      const { handleGiveawayEnter } = await import('./giveawayButton.js');
      return handleGiveawayEnter(interaction, client);
    }
    if (interaction.customId.startsWith('ticket_create')) {
      const { handleTicketCreate } = await import('./ticketButton.js');
      return handleTicketCreate(interaction, client);
    }
    if (interaction.customId.startsWith('ticket_close')) {
      const { handleTicketClose } = await import('./ticketButton.js');
      return handleTicketClose(interaction, client);
    }
  }
}
