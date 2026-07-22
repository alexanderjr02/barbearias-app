-- CreateIndex
CREATE INDEX "Appointment_barbershopId_date_idx" ON "Appointment"("barbershopId", "date");

-- CreateIndex
CREATE INDEX "Appointment_barbershopId_status_idx" ON "Appointment"("barbershopId", "status");

-- CreateIndex
CREATE INDEX "Appointment_clientId_date_idx" ON "Appointment"("clientId", "date");

-- CreateIndex
CREATE INDEX "Appointment_staffId_date_idx" ON "Appointment"("staffId", "date");

-- CreateIndex
CREATE INDEX "AutopilotLog_barbershopId_createdAt_idx" ON "AutopilotLog"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_barbershopId_createdAt_idx" ON "ChatMessage"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_barbershopId_date_idx" ON "FinancialTransaction"("barbershopId", "date");

-- CreateIndex
CREATE INDEX "Notification_barbershopId_createdAt_idx" ON "Notification"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_barbershopId_idx" ON "Product"("barbershopId");

-- CreateIndex
CREATE INDEX "Service_barbershopId_idx" ON "Service"("barbershopId");

-- CreateIndex
CREATE INDEX "Staff_barbershopId_idx" ON "Staff"("barbershopId");
