# 💖 Doki Doki WoW Bot

A friendly Discord bot for **Doki Doki Kawaii Club** - your WoW guild management companion! Track consumable reimbursements and BoE sales with ease.

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

### ❓ Help
- `/help` - Display all available commands

## 🎯 Role Permissions

- **Consumables Role** - Can add ledger entries and BoE sales
- **Officer Role** - Full access including pay/delete commands

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later LTS recommended)
- npm or yarn
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

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
   OFFICER_ROLE_ID=your_officer_role_id
   CONSUMABLES_ROLE_ID=your_consumables_role_id
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

## 💾 Database

```bash
npx prisma studio    # View/edit data
npx prisma migrate reset  # Reset database
```

---

Made with 💕 for Doki Doki Kawaii Club
