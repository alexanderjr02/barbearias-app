-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "durationDays" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coupon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CouponRedemption_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "chatbotEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatbotName" TEXT,
    "chatbotWelcome" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "planExpiresAt" DATETIME,
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "compReason" TEXT,
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
INSERT INTO "new_Barbershop" ("address", "appTagline", "autoBirthday", "autoConfirm", "autoWinbackDays", "autopilotLevel", "bgBlur", "bgDim", "bgEffect", "bgGradient", "bgType", "bgVideo", "chatbotEnabled", "chatbotName", "chatbotWelcome", "city", "cnpj", "coverImage", "createdAt", "description", "email", "faqText", "fiscalApiKey", "fiscalProvider", "goldDiscount", "goldThreshold", "id", "instagram", "isActive", "issRate", "logo", "loyaltyEnabled", "monthlyGoal", "mpPreapprovalId", "mpSubscriptionStatus", "municipalServiceCode", "name", "onboardingDismissed", "ownerId", "paymentApiKey", "paymentProvider", "phone", "pixKey", "plan", "pointsPerReal", "primaryColor", "referralEnabled", "referralFriendReward", "referralReferrerReward", "secondaryColor", "silverDiscount", "silverThreshold", "slug", "stampEnabled", "stampGoal", "stampRewardLabel", "state", "taxRegime", "themeMode", "themePreset", "updatedAt", "whatsapp", "zipCode") SELECT "address", "appTagline", "autoBirthday", "autoConfirm", "autoWinbackDays", "autopilotLevel", "bgBlur", "bgDim", "bgEffect", "bgGradient", "bgType", "bgVideo", "chatbotEnabled", "chatbotName", "chatbotWelcome", "city", "cnpj", "coverImage", "createdAt", "description", "email", "faqText", "fiscalApiKey", "fiscalProvider", "goldDiscount", "goldThreshold", "id", "instagram", "isActive", "issRate", "logo", "loyaltyEnabled", "monthlyGoal", "mpPreapprovalId", "mpSubscriptionStatus", "municipalServiceCode", "name", "onboardingDismissed", "ownerId", "paymentApiKey", "paymentProvider", "phone", "pixKey", "plan", "pointsPerReal", "primaryColor", "referralEnabled", "referralFriendReward", "referralReferrerReward", "secondaryColor", "silverDiscount", "silverThreshold", "slug", "stampEnabled", "stampGoal", "stampRewardLabel", "state", "taxRegime", "themeMode", "themePreset", "updatedAt", "whatsapp", "zipCode" FROM "Barbershop";
DROP TABLE "Barbershop";
ALTER TABLE "new_Barbershop" RENAME TO "Barbershop";
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "Barbershop"("slug");
CREATE INDEX "Barbershop_ownerId_idx" ON "Barbershop"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive");

-- CreateIndex
CREATE INDEX "CouponRedemption_barbershopId_idx" ON "CouponRedemption"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_barbershopId_key" ON "CouponRedemption"("couponId", "barbershopId");
