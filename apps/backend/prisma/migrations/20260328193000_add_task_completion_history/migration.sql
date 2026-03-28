-- Add lifecycle timestamps for task completion flow
ALTER TABLE "Task"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "completionConfirmedAt" TIMESTAMP(3);

CREATE INDEX "Task_completionConfirmedAt_idx" ON "Task"("completionConfirmedAt");
CREATE INDEX "Task_startedAt_idx" ON "Task"("startedAt");
