import * as cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';

// Channel ID for birthday announcements
const BIRTHDAY_CHANNEL_ID = '436750185368911874';

// Hour to post birthday wishes (in user's local timezone)
const BIRTHDAY_HOUR = 0; // 12 AM (midnight) - posts the moment their birthday starts

/**
 * Get the current date/time in a specific timezone
 */
function getDateInTimezone(timezone: string): { month: number; day: number; hour: number; year: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');

  return { month, day, hour, year };
}

/**
 * Check and post birthday wishes
 */
export async function checkBirthdays(client: Client, prisma: PrismaClient): Promise<void> {
  try {
    // Get the birthday channel
    const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error('❌ Birthday channel not found or is not a text channel');
      return;
    }

    // Get all birthdays
    const birthdays = await prisma.birthday.findMany();

    for (const birthday of birthdays) {
      try {
        const { month, day, hour, year } = getDateInTimezone(birthday.timezone);

        // Check if it's their birthday and it's the posting hour (or later, but we haven't wished yet)
        const isBirthday = birthday.month === month && birthday.day === day;
        const isPastPostingHour = hour >= BIRTHDAY_HOUR;
        const alreadyWishedThisYear = birthday.lastWishedYear === year;

        if (isBirthday && isPastPostingHour && !alreadyWishedThisYear) {
          // Try to find the user in any of the bot's guilds
          let userFound = false;

          for (const guild of client.guilds.cache.values()) {
            try {
              const member = await guild.members.fetch(birthday.discordId);
              if (member) {
                userFound = true;
                break;
              }
            } catch {
              // User not in this guild, continue checking
            }
          }

          if (userFound) {
            // Post birthday message
            const messages = [
              `🎂 Happy Birthday <@${birthday.discordId}>! 🎉 Hope you have an amazing day!`,
              `🎈 It's <@${birthday.discordId}>'s birthday today! 🎂 Wishing you all the best!`,
              `🥳 Happy Birthday <@${birthday.discordId}>! 🎁 May your day be filled with joy!`,
              `🎉 Everyone wish <@${birthday.discordId}> a Happy Birthday! 🎂`,
              `✨ Happy Birthday <@${birthday.discordId}>! 🎊 Have a fantastic day!`,
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            await channel.send(randomMessage);
            console.log(`🎂 Sent birthday wish to user ${birthday.discordId}`);

            // Update lastWishedYear
            await prisma.birthday.update({
              where: { id: birthday.id },
              data: { lastWishedYear: year },
            });
          } else {
            console.log(`⚠️ Skipping birthday for ${birthday.discordId} - user not found in any guild`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing birthday for ${birthday.discordId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking birthdays:', error);
  }
}

/**
 * Start the birthday scheduler
 * Runs every hour to check for birthdays
 */
export function startBirthdayScheduler(client: Client, prisma: PrismaClient): void {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🔍 Checking for birthdays...');
    await checkBirthdays(client, prisma);
  });

  console.log('🎂 Birthday scheduler started (checks every hour)');

  // Also run immediately on startup to catch any missed birthdays
  setTimeout(async () => {
    console.log('🔍 Running initial birthday check...');
    await checkBirthdays(client, prisma);
  }, 5000); // Wait 5 seconds for bot to fully initialize
}
