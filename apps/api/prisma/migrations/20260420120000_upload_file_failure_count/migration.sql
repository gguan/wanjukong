-- Track consecutive cleanup-deletion failures so the hourly cleanup cron
-- can stop retrying (and log-spamming) on persistently un-deletable rows.
ALTER TABLE "UploadFile"
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0;

-- Terminal state for rows that the cron has given up on.
ALTER TYPE "UploadFileStatus" ADD VALUE IF NOT EXISTS 'FAILED';
