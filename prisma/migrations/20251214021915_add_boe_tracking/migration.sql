-- CreateTable
CREATE TABLE "BoE" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "armorType" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "looterId" INTEGER NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "playerCut" INTEGER NOT NULL,
    "guildCut" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datePaid" DATETIME,
    "notes" TEXT,
    CONSTRAINT "BoE_looterId_fkey" FOREIGN KEY ("looterId") REFERENCES "Raider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
