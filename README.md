# 💰 Discord Ledger Bot

A friendly Discord bot for tracking consumable reimbursement ledger entries for World of Warcraft guilds! Built with Node.js, TypeScript, discord.js v14, and Prisma with SQLite.

> 💡 **Made with Cursor Composer 1**

## ✨ Features

- **`/ledger add`** - Add a new consumable reimbursement entry 📝
- **`/ledger my`** - View your unpaid ledger entries 👀
- **`/ledger all`** - View all unpaid entries grouped by raider (Officer only) 📊
- **`/ledger pay`** - Mark an entry as paid (Officer only) ✅

## 🎯 Role Permissions

- **Consumables Role** - Can add entries and view their own entries (`/ledger add`, `/ledger my`, `/ledger all`)
- **Officer Role** - Full access to all commands including marking entries as paid

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later LTS recommended)
- npm or yarn
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd discord-ledger-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
4. **Initialize the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Register slash commands**
   ```bash
   npm run register
   ```

6. **Start the bot**
   
   Development mode (with hot reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm run build
   npm start
   ```

## 📖 Command Reference

### `/ledger add`
Add a new consumable reimbursement entry.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| item | string | ✅ | Name of the item |
| gold | integer | ✅ | Gold spent (minimum: 0) |

### `/ledger my`
View your own unpaid ledger entries with total gold owed.

### `/ledger all`
*Officer only* - View all unpaid entries grouped by raider name.

### `/ledger pay`
*Officer only* - Mark a ledger entry as paid.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| id | integer | ✅ | The entry ID to mark as paid |

## 📁 Project Structure

```
discord-ledger-bot/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── commands/
│   │   └── ledger.ts      # All ledger subcommands
│   ├── utils/
│   │   └── registerCommands.ts  # Slash command registration
│   └── index.ts           # Bot entry point
├── .env                   # Environment variables (not in repo)
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run bot in development mode with hot reload 🔥 |
| `npm run build` | Compile TypeScript to JavaScript 📦 |
| `npm start` | Run compiled bot (production) 🚀 |
| `npm run register` | Register slash commands to Discord 📝 |

## 💾 Database Management

**View database in Prisma Studio:**
```bash
npx prisma studio
```

**Reset database:**
```bash
npx prisma migrate reset
```

**Create a new migration after schema changes:**
```bash
npx prisma migrate dev --name your_migration_name
```
