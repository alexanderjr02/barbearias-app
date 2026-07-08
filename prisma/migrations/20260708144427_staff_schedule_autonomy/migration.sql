-- CreateTable
CREATE TABLE "StaffTimeOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "staffId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffTimeOff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffTimeOff_staffId_date_key" ON "StaffTimeOff"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_staffId_dayOfWeek_key" ON "Availability"("staffId", "dayOfWeek");
