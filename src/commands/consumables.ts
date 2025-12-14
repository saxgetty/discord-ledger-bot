import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

export const data = new SlashCommandBuilder()
  .setName('consumables')
  .setDescription('Track consumable reimbursements for raiders')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Log gold spent on consumables')
      .addStringOption(option =>
        option
          .setName('item')
          .setDescription('Name of the consumable (e.g., Flask of Power)')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('gold')
          .setDescription('Gold spent')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('my')
      .setDescription('View your unpaid consumable entries')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('all')
      .setDescription('View all unpaid consumable entries (Officer only)')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('pay')
      .setDescription('Mark a consumable entry as paid (Officer only)')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The ID of the entry to mark as paid')
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
    case 'my':
      await handleMy(interaction, prisma);
      break;
    case 'all':
      await handleAll(interaction, prisma);
      break;
    case 'pay':
      await handlePay(interaction, prisma);
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

// Gold icon URL
const GOLD_ICON_URL = 'https://imgur.com/03nus3n.png';

// Format gold amount nicely
function formatGold(gold: number): string {
  return `${gold.toLocaleString()}g`;
}

// Handle /consumables add
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

  const item = interaction.options.getString('item', true);
  const gold = interaction.options.getInteger('gold', true);

  const discordId = interaction.user.id;
  const userName = interaction.user.displayName || interaction.user.username;

  try {
    // Upsert raider (create if doesn't exist)
    let raider = await prisma.raider.findUnique({
      where: { discordId },
    });

    if (!raider) {
      raider = await prisma.raider.create({
        data: {
          discordId,
          name: userName,
        },
      });
    }

    // Create entry
    const entry = await prisma.ledgerEntry.create({
      data: {
        raiderId: raider.id,
        item,
        goldSpent: gold,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🧪 Consumable Logged')
      .setDescription('Your consumable purchase has been recorded for reimbursement.')
      .setThumbnail(GOLD_ICON_URL)
      .addFields(
        { name: 'Item', value: item, inline: true },
        { name: 'Gold Spent', value: formatGold(gold), inline: true },
        { name: 'Entry ID', value: `#${entry.id}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Logged by ${userName}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error adding consumable entry:', error);
    await interaction.reply({
      content: 'Failed to add entry. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /consumables my
async function handleMy(
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

  const discordId = interaction.user.id;
  const userName = interaction.user.displayName || interaction.user.username;

  try {
    const raider = await prisma.raider.findUnique({
      where: { discordId },
      include: {
        entries: {
          where: { paid: false },
          orderBy: { dateCreated: 'asc' },
        },
      },
    });

    if (!raider || raider.entries.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('🧪 Your Consumables')
        .setDescription('You have no unpaid consumable entries.')
        .setThumbnail(GOLD_ICON_URL)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Calculate total
    const totalGold = raider.entries.reduce((sum, entry) => sum + entry.goldSpent, 0);

    // Build entries list
    const entriesList = raider.entries
      .map(entry => {
        const date = entry.dateCreated.toLocaleDateString();
        return `**#${entry.id}** | ${entry.item} - ${formatGold(entry.goldSpent)}\n*Added: ${date}*`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🧪 Your Unpaid Consumables')
      .setDescription(entriesList)
      .setThumbnail(GOLD_ICON_URL)
      .addFields({
        name: 'Total Owed',
        value: formatGold(totalGold),
        inline: false,
      })
      .setTimestamp()
      .setFooter({ text: `${raider.entries.length} unpaid entries | ${userName}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching consumable entries:', error);
    await interaction.reply({
      content: 'Failed to fetch your entries. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /consumables all
async function handleAll(
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

  try {
    const raiders = await prisma.raider.findMany({
      where: {
        entries: {
          some: { paid: false },
        },
      },
      include: {
        entries: {
          where: { paid: false },
          orderBy: { dateCreated: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (raiders.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('🧪 Guild Consumables')
        .setDescription('There are no unpaid consumable entries.')
        .setThumbnail(GOLD_ICON_URL)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Calculate grand total
    const grandTotal = raiders.reduce(
      (sum, raider) =>
        sum + raider.entries.reduce((s, e) => s + e.goldSpent, 0),
      0
    );

    const totalEntries = raiders.reduce((sum, r) => sum + r.entries.length, 0);

    // Build grouped entries
    const embeds: EmbedBuilder[] = [];
    let currentEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🧪 All Unpaid Consumables')
      .setThumbnail(GOLD_ICON_URL)
      .setTimestamp();

    let fieldCount = 0;

    for (const raider of raiders) {
      const raiderTotal = raider.entries.reduce((sum, e) => sum + e.goldSpent, 0);

      const entriesText = raider.entries
        .map(entry => {
          return `#${entry.id} | ${entry.item} - ${formatGold(entry.goldSpent)}`;
        })
        .join('\n');

      const fieldValue = `${entriesText}\n\n**Subtotal: ${formatGold(raiderTotal)}**`;

      // Discord embeds have a limit of 25 fields
      if (fieldCount >= 24) {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle('🧪 All Unpaid Consumables (continued)')
          .setThumbnail(GOLD_ICON_URL)
          .setTimestamp();
        fieldCount = 0;
      }

      // Field values can only be 1024 characters, truncate if needed
      const truncatedValue = fieldValue.length > 1024 
        ? fieldValue.substring(0, 1020) + '...' 
        : fieldValue;

      currentEmbed.addFields({
        name: raider.name,
        value: truncatedValue,
        inline: false,
      });
      fieldCount++;
    }

    // Add footer with totals to last embed
    currentEmbed.setFooter({
      text: `Total: ${formatGold(grandTotal)} | ${totalEntries} entries from ${raiders.length} raiders`,
    });

    embeds.push(currentEmbed);

    await interaction.reply({ embeds });
  } catch (error) {
    console.error('Error fetching all consumable entries:', error);
    await interaction.reply({
      content: 'Failed to fetch entries. Please try again later.',
      ephemeral: true,
    });
  }
}

// Handle /consumables pay
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

  const entryId = interaction.options.getInteger('id', true);

  try {
    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: entryId },
      include: { raider: true },
    });

    if (!entry) {
      await interaction.reply({
        content: `Entry #${entryId} not found.`,
        ephemeral: true,
      });
      return;
    }

    if (entry.paid) {
      await interaction.reply({
        content: `Entry #${entryId} is already marked as paid.`,
        ephemeral: true,
      });
      return;
    }

    // Mark as paid
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id: entryId },
      data: {
        paid: true,
        datePaid: new Date(),
      },
      include: { raider: true },
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Consumable Paid')
      .setDescription(`Entry #${entryId} has been marked as paid.`)
      .setThumbnail(GOLD_ICON_URL)
      .addFields(
        { name: 'Raider', value: updatedEntry.raider.name, inline: true },
        { name: 'Item', value: updatedEntry.item, inline: true },
        { name: 'Gold', value: formatGold(updatedEntry.goldSpent), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Paid by ${interaction.user.displayName || interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error marking entry as paid:', error);
    await interaction.reply({
      content: 'Failed to mark entry as paid. Please try again later.',
      ephemeral: true,
    });
  }
}
