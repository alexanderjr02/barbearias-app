-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Barbershop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#D4AF37',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "instagram" TEXT,
    "whatsapp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "pointsPerReal" INTEGER NOT NULL DEFAULT 10,
    "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Barbershop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Barbershop" ("address", "city", "coverImage", "createdAt", "description", "email", "id", "instagram", "isActive", "logo", "name", "ownerId", "phone", "plan", "pointsPerReal", "primaryColor", "secondaryColor", "slug", "state", "updatedAt", "whatsapp", "zipCode") SELECT "address", "city", "coverImage", "createdAt", "description", "email", "id", "instagram", "isActive", "logo", "name", "ownerId", "phone", "plan", "pointsPerReal", "primaryColor", "secondaryColor", "slug", "state", "updatedAt", "whatsapp", "zipCode" FROM "Barbershop";
DROP TABLE "Barbershop";
ALTER TABLE "new_Barbershop" RENAME TO "Barbershop";
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "Barbershop"("slug");
CREATE UNIQUE INDEX "Barbershop_ownerId_key" ON "Barbershop"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_barbershopId_idx" ON "Notification"("barbershopId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
