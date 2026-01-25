# 💖 Doki Doki WoW Bot

A friendly Discord bot for **Doki Doki Kawaii Club** - your WoW guild management companion! Track consumable reimbursements and BoE sales with ease.

> 💡 **Made with Cursor Composer 1 and hosted by Railway**

## ✨ Features

### 🧪 Consumable Reimbursements
Track gold spent on raid consumables for reimbursement.
- `/consumables add` - Log gold spent on consumables
- `/consumables my` - View your unpaid entries
- `/consumables all` - View all unpaid entries *(Officer only)*
- `/consumables pay` - Mark as paid *(Officer only)*

### 📦 BoE Sales Tracking
Track Bind on Equip items from raids with automatic **20% player / 80% guild** split!

```
Neg - [H] Plate Helmet - 1,500,000g SOLD - 300k PAID - 1.2M GUILD
```

- `/boe add` - Record a sold BoE (auto-calculates split)
- `/boe list` - View BoEs awaiting payout
- `/boe pay` - Mark player as paid *(Officer only)*
- `/boe delete` - Remove entry *(Officer only)*

### 🎂 Birthday Announcements
Automatic birthday wishes posted at **midnight** in each user's local timezone!

- `/birthday list` - View all registered birthdays
- `/birthday next` - See the next 5 upcoming birthdays
- `/birthday add` - Add a birthday *(Officer/Veteran only)*
- `/birthday edit` - Edit a birthday *(Officer/Veteran only)*
- `/birthday remove` - Remove a birthday *(Officer/Veteran only)*

**Features:**
- Timezone-aware posting (PST, CST, EST, GMT, CET, MST)
- Posts at midnight in user's local time
- Automatically skips users who have left the server
- Only posts once per year per person

### ❓ Help
- `/help` - Display all available commands

## 🎯 Role Permissions

- **Consumables Role** - Can add ledger entries and BoE sales
- **Veteran Role** - Can manage birthdays (add/edit/remove)
- **Officer Role** - Full access including pay/delete commands and birthday management

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later LTS recommended)
- npm or yarn
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- **Server Members Intent** enabled (required for birthday feature to check if users are still in the server)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd discord-ledger-bot
   npm install
   ```

2. **Configure environment**
   
   Create a `.env` file:
   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_GUILD_ID=your_guild_id
   OFFICER_ROLE_IDS=your_officer_role_id
   CONSUMABLES_ROLE_ID=your_consumables_role_id
   VETERAN_ROLE_ID=your_veteran_role_id
   BIRTHDAY_CHANNEL_ID=your_birthday_channel_id
   DATABASE_URL="file:./dev.db"
   ```

3. **Setup database**
   ```bash
   npx prisma migrate dev
   ```

4. **Register commands and start**
   ```bash
   npm run register
   npm run dev
   ```

## 🛠️ Commands

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Production mode |
| `npm run register` | Register slash commands |
| `npm run seed:birthdays` | Seed initial birthday data |

## 💾 Database

```bash
npx prisma studio    # View/edit data
npx prisma migrate reset  # Reset database
```

---

Made with 💕 for Doki Doki Kawaii Club
