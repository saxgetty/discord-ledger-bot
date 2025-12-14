import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

export const data = new SlashCommandBuilder()
  .setName('boe')
  .setDescription('Track guild BoE sales (20% player / 80% guild split)')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a sold BoE (auto-calculates 20/80 split)')
      .addUserOption(option =>
        option
          .setName('looter')
          .setDescription('Who looted the BoE')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('difficulty')
          .setDescription('Raid difficulty')
          .setRequired(true)
          .addChoices(
            { name: '[N] Normal', value: 'N' },
            { name: '[H] Heroic', value: 'H' },
            { name: '[M] Mythic', value: 'M' }
          )
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Armor type')
          .setRequired(true)
          .addChoices(
            { name: 'Plate', value: 'Plate' },
            { name: 'Mail', value: 'Mail' },
            { name: 'Leather', value: 'Leather' },
            { name: 'Cloth', value: 'Cloth' },
            { name: 'Ring', value: 'Ring' },
            { name: 'Neck', value: 'Neck' },
            { name: 'Cloak', value: 'Cloak' },
            { name: 'Trinket', value: 'Trinket' }
          )
      )
      .addStringOption(option =>
        option
          .setName('slot')
          .setDescription('Gear slot')
          .setRequired(true)
          .addChoices(
            { name: 'Helm', value: 'Helm' },
            { name: 'Shoulders', value: 'Shoulders' },
            { name: 'Chest', value: 'Chest' },
            { name: 'Waist', value: 'Waist' },
            { name: 'Legs', value: 'Legs' },
            { name: 'Boots', value: 'Boots' },
            { name: 'Wrists', value: 'Wrists' },
            { name: 'Hands', value: 'Hands' },
            { name: 'Ring', value: 'Ring' },
            { name: 'Neck', value: 'Neck' },
            { name: 'Cloak', value: 'Cloak' },
            { name: 'Trinket', value: 'Trinket' }
          )
      )
      .addIntegerOption(option =>
        option
          .setName('price')
          .setDescription('Sale price in gold')
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption(option =>
        option
          .setName('notes')
          .setDescription('Optional notes (e.g., stats like haste/mast)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('View BoEs awaiting payout')
      .addStringOption(option =>
        option
          .setName('filter')
          .setDescription('Filter results')
          .setRequired(false)
          .addChoices(
            { name: 'Unpaid (awaiting payout)', value: 'unpaid' },
            { name: 'Paid (completed)', value: 'paid' },
            { name: 'All', value: 'all' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('pay')
      .setDescription('Mark a BoE as paid out to the player (Officer only)')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The ID of the BoE entry')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('delete')
      .setDescription('Delete a BoE entry (Officer only)')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The ID of the BoE entry to delete')
          .setRequired(true)
          .setMinValue(1)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'add':
      await handleAdd(interaction, prisma);
      break;
    case 'list':
      await handleList(interaction, prisma);
      break;
    case 'pay':
      await handlePay(interaction, prisma);
      break;
    case 'delete':
      await handleDelete(interaction, prisma);
      break;
    default:
      await interaction.reply({
        content: 'Unknown subcommand.',
        ephemeral: true,
      });
  }
}

// Role IDs from environment variables
const CONSUMABLES_ROLE_ID = process.env.CONSUMABLES_ROLE_ID;
const OFFICER_ROLE_ID = process.env.OFFICER_ROLE_ID;

// Helper function to check if user has officer role
function isOfficer(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member;
  if (!member || !('roles' in member)) {
    return false;
  }

  const memberRoles = member.roles;
  if ('cache' in memberRoles) {
    return memberRoles.cache.some(role => role.id === OFFICER_ROLE_ID);
  }

  return false;
}

// Helper function to check if user has consumables role
function hasConsumablesRole(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member;
  if (!member || !('roles' in member)) {
    return false;
  }

  const memberRoles = member.roles;
  if ('cache' in memberRoles) {
    return memberRoles.cache.some(role => role.id === CONSUMABLES_ROLE_ID);
  }

  return false;
}

// Helper function to check if user has required permissions (Consumables or Officer)
function hasRequiredRole(interaction: ChatInputCommandInteraction): boolean {
  return isOfficer(interaction) || hasConsumablesRole(interaction);
}

// Format gold amount nicely (matches your style: 156,798g or 1.2M)
function formatGold(gold: number): string {
  if (gold >= 1000000) {
    const millions = gold / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  return `${gold.toLocaleString()}g`;
}

// Get difficulty color (WoW item quality colors)
function getDifficultyColor(difficulty: string): number {
  switch (difficulty) {
    case 'M':
      return 0xa335ee; // Epic purple
    case 'H':
      return 0x0070dd; // Rare blue
    case 'N':
      return 0x1eff00; // Uncommon green
    default:
      return 0xffd700; // Gold
  }
}

// Handle /boe add
async function handleAdd(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!hasRequiredRole(interaction)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Consumables or Officer role required.',
      ephemeral: true,
    });
    return;
  }

  const looterUser = interaction.options.getUser('looter', true);
  const difficulty = interaction.options.getString('difficulty', true);
  const armorType = interaction.options.getString('type', true);
  const slot = interaction.options.getString('slot', true);
  const salePrice = interaction.options.getInteger('price', true);
  const notes = interaction.options.getString('notes');

  // Calculate 20/80 split
  const playerCut = Math.floor(salePrice * 0.2);
  const guildCut = salePrice - playerCut;

  try {
    // Upsert raider (create if doesn't exist)
    let raider = await prisma.raider.findUnique({
      where: { discordId: looterUser.id },
    });

    if (!raider) {
      raider = await prisma.raider.create({
        data: {
          discordId: looterUser.id,
          name: looterUser.displayName || looterUser.username,
        },
      });
    }

    // Create BoE entry
    const boe = await prisma.boE.create({
      data: {
        armorType,
        slot,
        difficulty,
        looterId: raider.id,
        salePrice,
        playerCut,
        guildCut,
        notes,
      },
    });

    // Format the item description like your current style
    const itemDesc = armorType === slot ? armorType : `${armorType} ${slot}`;
    const notesText = notes ? ` (${notes})` : '';

    // Create embed matching your format style
    const embed = new EmbedBuilder()
      .setColor(getDifficultyColor(difficulty))
      .setTitle('📦 BoE Sold!')
      .setDescription(
        `**${raider.name}** - [${difficulty}] ${itemDesc}${notesText} - ${formatGold(salePrice)} SOLD`
      )
      .addFields(
        { name: 'Player Cut (20%)', value: formatGold(playerCut), inline: true },
        { name: 'Guild Cut (80%)', value: formatGold(guildCut), inline: true },
        { name: 'Entry ID', value: `#${boe.id}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Added by ${interaction.user.displayName || interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error adding BoE:', error);
    await interaction.reply({
      content: 'Failed to add BoE entry. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /boe list
async function handleList(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!hasRequiredRole(interaction)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Consumables or Officer role required.',
      ephemeral: true,
    });
    return;
  }

  const filter = interaction.options.getString('filter') || 'unpaid';

  try {
    const whereClause = filter === 'all' ? {} : { paid: filter === 'paid' };

    const boes = await prisma.boE.findMany({
      where: whereClause,
      include: { looter: true },
      orderBy: { dateAdded: 'desc' },
    });

    if (boes.length === 0) {
      const filterText = filter === 'unpaid' ? 'unpaid' : filter === 'paid' ? 'paid' : '';
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('📦 BoE Tracker')
        .setDescription(`No ${filterText} BoE entries found.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Build the list in your familiar format
    const lines: string[] = [];
    let totalPlayerOwed = 0;
    let totalGuildEarned = 0;

    for (const boe of boes) {
      const itemDesc = boe.armorType === boe.slot ? boe.armorType : `${boe.armorType} ${boe.slot}`;
      const notesText = boe.notes ? ` (${boe.notes})` : '';
      const paidStatus = boe.paid ? '✅ PAID' : '⏳ UNPAID';
      
      lines.push(
        `**#${boe.id}** ${boe.looter.name} - [${boe.difficulty}] ${itemDesc}${notesText}\n` +
        `${formatGold(boe.salePrice)} SOLD - ${formatGold(boe.playerCut)} Player - ${formatGold(boe.guildCut)} Guild - ${paidStatus}`
      );

      if (!boe.paid) {
        totalPlayerOwed += boe.playerCut;
      }
      totalGuildEarned += boe.guildCut;
    }

    // Split into multiple embeds if needed (Discord limit)
    const embeds: EmbedBuilder[] = [];
    let currentDescription = '';
    let embedIndex = 0;

    for (const line of lines) {
      if (currentDescription.length + line.length + 2 > 4000) {
        embeds.push(
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(embedIndex === 0 ? '📦 BoE Tracker' : '📦 BoE Tracker (continued)')
            .setDescription(currentDescription)
        );
        currentDescription = '';
        embedIndex++;
      }
      currentDescription += (currentDescription ? '\n\n' : '') + line;
    }

    // Add the last embed
    const lastEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(embedIndex === 0 ? '📦 BoE Tracker' : '📦 BoE Tracker (continued)')
      .setDescription(currentDescription)
      .setTimestamp();

    if (filter === 'unpaid' || filter === 'all') {
      lastEmbed.setFooter({
        text: `${boes.length} entries | ${formatGold(totalPlayerOwed)} owed to players | ${formatGold(totalGuildEarned)} to guild bank`,
      });
    } else {
      lastEmbed.setFooter({ text: `${boes.length} entries` });
    }

    embeds.push(lastEmbed);

    await interaction.reply({ embeds });
  } catch (error) {
    console.error('Error listing BoEs:', error);
    await interaction.reply({
      content: 'Failed to fetch BoE entries. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /boe pay
async function handlePay(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!isOfficer(interaction)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Officer role required.',
      ephemeral: true,
    });
    return;
  }

  const boeId = interaction.options.getInteger('id', true);

  try {
    const boe = await prisma.boE.findUnique({
      where: { id: boeId },
      include: { looter: true },
    });

    if (!boe) {
      await interaction.reply({
        content: `BoE entry #${boeId} not found.`,
        ephemeral: true,
      });
      return;
    }

    if (boe.paid) {
      await interaction.reply({
        content: `BoE entry #${boeId} is already marked as paid.`,
        ephemeral: true,
      });
      return;
    }

    const updatedBoe = await prisma.boE.update({
      where: { id: boeId },
      data: {
        paid: true,
        datePaid: new Date(),
      },
      include: { looter: true },
    });

    const itemDesc = updatedBoe.armorType === updatedBoe.slot 
      ? updatedBoe.armorType 
      : `${updatedBoe.armorType} ${updatedBoe.slot}`;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ BoE Paid!')
      .setDescription(
        `**${updatedBoe.looter.name}** - [${updatedBoe.difficulty}] ${itemDesc} - ${formatGold(updatedBoe.playerCut)} PAID`
      )
      .addFields(
        { name: 'Sale Price', value: formatGold(updatedBoe.salePrice), inline: true },
        { name: 'Player Cut', value: formatGold(updatedBoe.playerCut), inline: true },
        { name: 'Guild Cut', value: formatGold(updatedBoe.guildCut), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Paid by ${interaction.user.displayName || interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error marking BoE as paid:', error);
    await interaction.reply({
      content: 'Failed to mark BoE as paid. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /boe delete
async function handleDelete(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!isOfficer(interaction)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Officer role required.',
      ephemeral: true,
    });
    return;
  }

  const boeId = interaction.options.getInteger('id', true);

  try {
    const boe = await prisma.boE.findUnique({
      where: { id: boeId },
      include: { looter: true },
    });

    if (!boe) {
      await interaction.reply({
        content: `BoE entry #${boeId} not found.`,
        ephemeral: true,
      });
      return;
    }

    await prisma.boE.delete({
      where: { id: boeId },
    });

    const itemDesc = boe.armorType === boe.slot ? boe.armorType : `${boe.armorType} ${boe.slot}`;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🗑️ BoE Deleted')
      .setDescription(`**${boe.looter.name}** - [${boe.difficulty}] ${itemDesc} - ${formatGold(boe.salePrice)}`)
      .setTimestamp()
      .setFooter({ text: `Deleted by ${interaction.user.displayName || interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error deleting BoE:', error);
    await interaction.reply({
      content: 'Failed to delete BoE entry. Please try again later.',
      ephemeral: true,
    });
  }
}
