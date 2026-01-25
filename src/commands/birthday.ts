import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

// Valid timezone options
const TIMEZONE_CHOICES = [
  { name: 'PST (Pacific)', value: 'America/Los_Angeles' },
  { name: 'MST (Mountain)', value: 'America/Denver' },
  { name: 'CST (Central)', value: 'America/Chicago' },
  { name: 'EST (Eastern)', value: 'America/New_York' },
  { name: 'GMT (UK)', value: 'Europe/London' },
  { name: 'CET (Central Europe)', value: 'Europe/Paris' },
];

// Month choices for cleaner input
const MONTH_CHOICES = [
  { name: 'January', value: 1 },
  { name: 'February', value: 2 },
  { name: 'March', value: 3 },
  { name: 'April', value: 4 },
  { name: 'May', value: 5 },
  { name: 'June', value: 6 },
  { name: 'July', value: 7 },
  { name: 'August', value: 8 },
  { name: 'September', value: 9 },
  { name: 'October', value: 10 },
  { name: 'November', value: 11 },
  { name: 'December', value: 12 },
];

export const data = new SlashCommandBuilder()
  .setName('birthday')
  .setDescription('Manage birthday announcements')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a birthday (Admin only)')
      .addUserOption(option =>
        option.setName('user').setDescription('The user to add').setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('month')
          .setDescription('Birth month')
          .setRequired(true)
          .addChoices(...MONTH_CHOICES)
      )
      .addIntegerOption(option =>
        option
          .setName('day')
          .setDescription('Birth day (1-31)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(31)
      )
      .addStringOption(option =>
        option
          .setName('timezone')
          .setDescription('Timezone')
          .setRequired(true)
          .addChoices(...TIMEZONE_CHOICES)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a birthday (Admin only)')
      .addUserOption(option =>
        option.setName('user').setDescription('The user to remove').setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('edit')
      .setDescription('Edit a birthday (Admin only)')
      .addUserOption(option =>
        option.setName('user').setDescription('The user to edit').setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('month')
          .setDescription('New birth month (optional)')
          .addChoices(...MONTH_CHOICES)
      )
      .addIntegerOption(option =>
        option
          .setName('day')
          .setDescription('New birth day (optional)')
          .setMinValue(1)
          .setMaxValue(31)
      )
      .addStringOption(option =>
        option
          .setName('timezone')
          .setDescription('New timezone (optional)')
          .addChoices(...TIMEZONE_CHOICES)
      )
  )
  .addSubcommand(subcommand =>
    subcommand.setName('list').setDescription('List all birthdays')
  )
  .addSubcommand(subcommand =>
    subcommand.setName('next').setDescription('Show upcoming birthdays')
  );

/**
 * Check if user is authorized to manage birthdays
 * Allows: Officers and Veterans
 */
function isAuthorized(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member;
  if (!member || !member.roles) return false;

  const roles = member.roles as GuildMemberRoleManager;
  
  // Read env vars at runtime (not module load time)
  const officerRoleIds: string[] = process.env.OFFICER_ROLE_IDS
    ? process.env.OFFICER_ROLE_IDS.split(',').map(id => id.trim())
    : [];
  const veteranRoleId = process.env.VETERAN_ROLE_ID || '';
  
  // Check if user has Officer role
  const hasOfficerRole = officerRoleIds.some(roleId => roles.cache.has(roleId));
  
  // Check if user has Veteran role
  const hasVeteranRole = veteranRoleId ? roles.cache.has(veteranRoleId) : false;

  return hasOfficerRole || hasVeteranRole;
}

/**
 * Get month name from number
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] || 'Unknown';
}

/**
 * Get timezone display name
 */
function getTimezoneDisplay(timezone: string): string {
  const tzMap: Record<string, string> = {
    'America/Los_Angeles': 'PST',
    'America/Denver': 'MST',
    'America/Chicago': 'CST',
    'America/New_York': 'EST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
  };
  return tzMap[timezone] || timezone;
}

export async function execute(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'add':
      await handleAdd(interaction, prisma);
      break;
    case 'remove':
      await handleRemove(interaction, prisma);
      break;
    case 'edit':
      await handleEdit(interaction, prisma);
      break;
    case 'list':
      await handleList(interaction, prisma);
      break;
    case 'next':
      await handleNext(interaction, prisma);
      break;
    default:
      await interaction.reply({ content: '❌ Unknown subcommand', ephemeral: true });
  }
}

async function handleAdd(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!isAuthorized(interaction)) {
    await interaction.reply({
      content: '❌ You are not authorized to manage birthdays.',
      ephemeral: true,
    });
    return;
  }

  const user = interaction.options.getUser('user', true);
  const month = interaction.options.getInteger('month', true);
  const day = interaction.options.getInteger('day', true);
  const timezone = interaction.options.getString('timezone', true);

  // Validate day for the month
  const daysInMonth = new Date(2024, month, 0).getDate(); // 2024 is a leap year
  if (day > daysInMonth) {
    await interaction.reply({
      content: `❌ Invalid day. ${getMonthName(month)} only has ${daysInMonth} days.`,
    });
    return;
  }

  // Check if birthday already exists
  const existing = await prisma.birthday.findUnique({
    where: { discordId: user.id },
  });

  if (existing) {
    await interaction.reply({
      content: `❌ ${user.username} already has a birthday set (${getMonthName(existing.month)} ${existing.day}). Use \`/birthday remove\` first if you want to change it.`,
    });
    return;
  }

  // Add the birthday
  await prisma.birthday.create({
    data: {
      discordId: user.id,
      month,
      day,
      timezone,
    },
  });

  await interaction.reply({
    content: `✅ Added birthday for ${user.username}: **${getMonthName(month)} ${day}** (${getTimezoneDisplay(timezone)})`,
  });
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!isAuthorized(interaction)) {
    await interaction.reply({
      content: '❌ You are not authorized to manage birthdays.',
      ephemeral: true,
    });
    return;
  }

  const user = interaction.options.getUser('user', true);

  const existing = await prisma.birthday.findUnique({
    where: { discordId: user.id },
  });

  if (!existing) {
    await interaction.reply({
      content: `❌ ${user.username} doesn't have a birthday set.`,
    });
    return;
  }

  await prisma.birthday.delete({
    where: { discordId: user.id },
  });

  await interaction.reply({
    content: `✅ Removed birthday for ${user.username}`,
  });
}

async function handleEdit(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  if (!isAuthorized(interaction)) {
    await interaction.reply({
      content: '❌ You are not authorized to manage birthdays.',
      ephemeral: true,
    });
    return;
  }

  const user = interaction.options.getUser('user', true);
  const month = interaction.options.getInteger('month');
  const day = interaction.options.getInteger('day');
  const timezone = interaction.options.getString('timezone');

  // Check if at least one field is provided
  if (!month && !day && !timezone) {
    await interaction.reply({
      content: '❌ Please provide at least one field to edit (month, day, or timezone).',
    });
    return;
  }

  // Check if birthday exists
  const existing = await prisma.birthday.findUnique({
    where: { discordId: user.id },
  });

  if (!existing) {
    await interaction.reply({
      content: `❌ ${user.username} doesn't have a birthday set. Use \`/birthday add\` first.`,
    });
    return;
  }

  // Use existing values if not provided
  const newMonth = month ?? existing.month;
  const newDay = day ?? existing.day;
  const newTimezone = timezone ?? existing.timezone;

  // Validate day for the month
  const daysInMonth = new Date(2024, newMonth, 0).getDate();
  if (newDay > daysInMonth) {
    await interaction.reply({
      content: `❌ Invalid day. ${getMonthName(newMonth)} only has ${daysInMonth} days.`,
    });
    return;
  }

  // Update the birthday
  await prisma.birthday.update({
    where: { discordId: user.id },
    data: {
      month: newMonth,
      day: newDay,
      timezone: newTimezone,
    },
  });

  await interaction.reply({
    content: `✅ Updated birthday for ${user.username}: **${getMonthName(newMonth)} ${newDay}** (${getTimezoneDisplay(newTimezone)})`,
  });
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  const birthdays = await prisma.birthday.findMany({
    orderBy: [{ month: 'asc' }, { day: 'asc' }],
  });

  if (birthdays.length === 0) {
    await interaction.reply({
      content: '📅 No birthdays have been added yet.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎂 Birthday List')
    .setColor(0xff69b4)
    .setDescription(
      birthdays
        .map(b => `<@${b.discordId}> - **${getMonthName(b.month)} ${b.day}** (${getTimezoneDisplay(b.timezone)})`)
        .join('\n')
    )
    .setFooter({ text: `${birthdays.length} birthdays registered` });

  await interaction.reply({ embeds: [embed] });
}

async function handleNext(
  interaction: ChatInputCommandInteraction,
  prisma: PrismaClient
): Promise<void> {
  const birthdays = await prisma.birthday.findMany();

  if (birthdays.length === 0) {
    await interaction.reply({
      content: '📅 No birthdays have been added yet.',
    });
    return;
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // Calculate days until each birthday
  const birthdaysWithDays = birthdays.map(b => {
    let targetDate = new Date(today.getFullYear(), b.month - 1, b.day);
    
    // If birthday has passed this year, use next year
    if (b.month < currentMonth || (b.month === currentMonth && b.day < currentDay)) {
      targetDate = new Date(today.getFullYear() + 1, b.month - 1, b.day);
    }

    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...b, daysUntil };
  });

  // Sort by days until birthday
  birthdaysWithDays.sort((a, b) => a.daysUntil - b.daysUntil);

  // Get next 5 birthdays
  const upcoming = birthdaysWithDays.slice(0, 5);

  const embed = new EmbedBuilder()
    .setTitle('🎈 Upcoming Birthdays')
    .setColor(0xff69b4)
    .setDescription(
      upcoming
        .map(b => {
          const dayText = b.daysUntil === 0 ? '**TODAY!** 🎉' : 
                          b.daysUntil === 1 ? '**Tomorrow!**' :
                          `in ${b.daysUntil} days`;
          return `<@${b.discordId}> - **${getMonthName(b.month)} ${b.day}** (${dayText})`;
        })
        .join('\n')
    );

  await interaction.reply({ embeds: [embed] });
}
