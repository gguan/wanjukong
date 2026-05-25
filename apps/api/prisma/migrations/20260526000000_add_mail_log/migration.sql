-- Persisted log of failed transactional sends so a cron / operator can
-- resend without re-deriving the payload from order state. Successful
-- sends are not logged here.

-- CreateEnum
CREATE TYPE "MailLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "MailLog" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "MailLogStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastTriedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailLog_status_createdAt_idx" ON "MailLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MailLog_refType_refId_idx" ON "MailLog"("refType", "refId");
