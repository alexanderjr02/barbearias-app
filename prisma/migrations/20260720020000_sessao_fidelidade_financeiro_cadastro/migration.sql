-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "recipeFinish" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "recipeMachine" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "recipeNotes" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "recipeProducts" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "referencePhoto" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "resultPhoto" TEXT;

-- AlterTable
ALTER TABLE "ClientSubscription" ADD COLUMN "mpPaymentId" TEXT;
ALTER TABLE "ClientSubscription" ADD COLUMN "mpPreapprovalId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Staff" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "Staff" ADD COLUMN "hireDate" DATETIME;
ALTER TABLE "Staff" ADD COLUMN "pixKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeBarbershopId" TEXT;
ALTER TABLE "User" ADD COLUMN "cpf" TEXT;
ALTER TABLE "User" ADD COLUMN "instagram" TEXT;
ALTER TABLE "User" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "User" ADD COLUMN "profession" TEXT;

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidToBarber" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tip_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tip_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tip_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutopilotLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "recoveredValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutopilotLog_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsage_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopilotAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "undoData" TEXT NOT NULL,
    "undoneAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopilotAction_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopilotMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "clientId" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopilotMemory_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "number" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "amount" REAL NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientDoc" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceInvoice_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "machine" TEXT,
    "products" TEXT,
    "allergies" TEXT,
    "drink" TEXT,
    "chat" TEXT,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CutPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "barbershopId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistEntry_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StampCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StampCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StampCard_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoyaltyReward_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "friendId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringExpense_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "cnpj" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#D4AF37',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "themePreset" TEXT,
    "themeMode" TEXT,
    "appTagline" TEXT,
    "bgType" TEXT,
    "bgVideo" TEXT,
    "bgDim" INTEGER,
    "bgBlur" INTEGER,
    "bgGradient" BOOLEAN NOT NULL DEFAULT true,
    "bgEffect" TEXT,
    "monthlyGoal" REAL,
    "autopilotLevel" TEXT NOT NULL DEFAULT 'suggest',
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "autoBirthday" BOOLEAN NOT NULL DEFAULT true,
    "autoWinbackDays" INTEGER DEFAULT 45,
    "instagram" TEXT,
    "whatsapp" TEXT,
    "pixKey" TEXT,
    "faqText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "mpPreapprovalId" TEXT,
    "mpSubscriptionStatus" TEXT,
    "paymentProvider" TEXT,
    "paymentApiKey" TEXT,
    "fiscalProvider" TEXT,
    "fiscalApiKey" TEXT,
    "municipalServiceCode" TEXT,
    "taxRegime" TEXT,
    "issRate" REAL,
    "pointsPerReal" INTEGER NOT NULL DEFAULT 10,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "silverThreshold" INTEGER NOT NULL DEFAULT 501,
    "goldThreshold" INTEGER NOT NULL DEFAULT 1501,
    "silverDiscount" REAL NOT NULL DEFAULT 0.05,
    "goldDiscount" REAL NOT NULL DEFAULT 0.10,
    "stampEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stampGoal" INTEGER NOT NULL DEFAULT 10,
    "stampRewardLabel" TEXT NOT NULL DEFAULT '1 corte grátis',
    "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
    "referralReferrerReward" TEXT NOT NULL DEFAULT 'R$ 10 de desconto',
    "referralFriendReward" TEXT NOT NULL DEFAULT 'R$ 10 de desconto',
    "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Barbershop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Barbershop" ("address", "city", "cnpj", "coverImage", "createdAt", "description", "email", "id", "instagram", "isActive", "logo", "name", "onboardingDismissed", "ownerId", "phone", "plan", "pointsPerReal", "primaryColor", "secondaryColor", "slug", "state", "updatedAt", "whatsapp", "zipCode") SELECT "address", "city", "cnpj", "coverImage", "createdAt", "description", "email", "id", "instagram", "isActive", "logo", "name", "onboardingDismissed", "ownerId", "phone", "plan", "pointsPerReal", "primaryColor", "secondaryColor", "slug", "state", "updatedAt", "whatsapp", "zipCode" FROM "Barbershop";
DROP TABLE "Barbershop";
ALTER TABLE "new_Barbershop" RENAME TO "Barbershop";
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "Barbershop"("slug");
CREATE INDEX "Barbershop_ownerId_idx" ON "Barbershop"("ownerId");
CREATE TABLE "new_BarbershopClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" DATETIME,
    "howFoundUs" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "preferredStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BarbershopClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BarbershopClient_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BarbershopClient_preferredStaffId_fkey" FOREIGN KEY ("preferredStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BarbershopClient" ("barbershopId", "createdAt", "id", "userId") SELECT "barbershopId", "createdAt", "id", "userId" FROM "BarbershopClient";
DROP TABLE "BarbershopClient";
ALTER TABLE "new_BarbershopClient" RENAME TO "BarbershopClient";
CREATE INDEX "BarbershopClient_barbershopId_marketingConsent_idx" ON "BarbershopClient"("barbershopId", "marketingConsent");
CREATE UNIQUE INDEX "BarbershopClient_userId_barbershopId_key" ON "BarbershopClient"("userId", "barbershopId");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "duration" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'HAIRCUT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "barbershopId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("barbershopId", "category", "createdAt", "description", "duration", "id", "image", "isActive", "name", "price", "updatedAt") SELECT "barbershopId", "category", "createdAt", "description", "duration", "id", "image", "isActive", "name", "price", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tip_appointmentId_key" ON "Tip"("appointmentId");

-- CreateIndex
CREATE INDEX "Tip_staffId_idx" ON "Tip"("staffId");

-- CreateIndex
CREATE INDEX "Tip_barbershopId_idx" ON "Tip"("barbershopId");

-- CreateIndex
CREATE INDEX "AutopilotLog_barbershopId_idx" ON "AutopilotLog"("barbershopId");

-- CreateIndex
CREATE INDEX "AiUsage_barbershopId_createdAt_idx" ON "AiUsage"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotAction_barbershopId_createdAt_idx" ON "CopilotAction"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotAction_userId_idx" ON "CopilotAction"("userId");

-- CreateIndex
CREATE INDEX "CopilotMemory_barbershopId_idx" ON "CopilotMemory"("barbershopId");

-- CreateIndex
CREATE INDEX "CopilotMemory_clientId_idx" ON "CopilotMemory"("clientId");

-- CreateIndex
CREATE INDEX "ServiceInvoice_barbershopId_idx" ON "ServiceInvoice"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPreferences_clientId_key" ON "ClientPreferences"("clientId");

-- CreateIndex
CREATE INDEX "CutPhoto_clientId_idx" ON "CutPhoto"("clientId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_barbershopId_idx" ON "WaitlistEntry"("barbershopId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_clientId_idx" ON "WaitlistEntry"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StampCard_userId_barbershopId_key" ON "StampCard"("userId", "barbershopId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_barbershopId_status_idx" ON "LoyaltyReward"("barbershopId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyReward_userId_idx" ON "LoyaltyReward"("userId");

-- CreateIndex
CREATE INDEX "Referral_friendId_idx" ON "Referral"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_barbershopId_code_key" ON "Referral"("barbershopId", "code");

-- CreateIndex
CREATE INDEX "RecurringExpense_barbershopId_isActive_idx" ON "RecurringExpense"("barbershopId", "isActive");

