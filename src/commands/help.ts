import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Display all available commands for Doki Doki WoW Bot');

export async function execute(
  interaction: ChatInputCommandInteraction,
  _prisma: PrismaClient
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xff69b4) // Hot pink for Doki Doki vibes!
    .setTitle('💖 Doki Doki WoW Bot')
    .setDescription('Your friendly guild management companion!')
    .addFields(
      {
        name: '🧪 __Consumable Reimbursements__',
        value: [
          '`/consumables add` - Log gold spent on consumables',
          '`/consumables my` - View your unpaid entries',
          '`/consumables all` - View all unpaid entries *(Officer)*',
          '`/consumables pay <id>` - Mark as paid *(Officer)*',
        ].join('\n'),
        inline: false,
      },
      {
        name: '📦 __BoE Sales__ (20% player / 80% guild)',
        value: [
          '`/boe add` - Record a sold BoE (auto-splits)',
          '`/boe list` - View BoEs awaiting payout',
          '`/boe pay <id>` - Mark player as paid *(Officer)*',
          '`/boe delete <id>` - Remove entry *(Officer)*',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔑 __Roles__',
        value: '**Consumables** - Add entries\n**Officer** - Full access',
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Doki Doki Kawaii Club 💕' });

  await interaction.reply({ embeds: [embed] });
}
