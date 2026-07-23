-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "name" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "campaign" TEXT,
    "ctwaClid" TEXT,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "adHeadline" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "isNewClient" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" DATETIME,
    "showedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Lead_barbershopId_channel_idx" ON "Lead"("barbershopId", "channel");

-- CreateIndex
CREATE INDEX "Lead_barbershopId_capturedAt_idx" ON "Lead"("barbershopId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_barbershopId_phoneKey_key" ON "Lead"("barbershopId", "phoneKey");
