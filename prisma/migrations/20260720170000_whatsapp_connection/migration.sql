-- CreateTable
CREATE TABLE "WhatsappConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhone" TEXT,
    "accessToken" TEXT NOT NULL,
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'pt_BR',
    "status" TEXT NOT NULL DEFAULT 'connected',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhatsappConnection_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConnection_barbershopId_key" ON "WhatsappConnection"("barbershopId");

-- CreateIndex
CREATE INDEX "WhatsappConnection_phoneNumberId_idx" ON "WhatsappConnection"("phoneNumberId");

