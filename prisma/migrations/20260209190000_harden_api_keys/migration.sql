-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "createdById" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "lastUsedIp" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "expiresAt" DATETIME;

-- CreateIndex
CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
