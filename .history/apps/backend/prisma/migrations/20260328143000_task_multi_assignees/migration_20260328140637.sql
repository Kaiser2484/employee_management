-- Create many-to-many table for task assignees
CREATE TABLE "TaskAssignee" (
    "taskId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("taskId", "assigneeId")
);

-- Migrate current single assignee into TaskAssignee rows
INSERT INTO "TaskAssignee" ("taskId", "assigneeId")
SELECT "id", "assigneeId"
FROM "Task"
WHERE "assigneeId" IS NOT NULL;

-- Drop old relation column
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_assigneeId_fkey";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "assigneeId";

-- Add foreign keys for join table
ALTER TABLE "TaskAssignee"
ADD CONSTRAINT "TaskAssignee_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskAssignee"
ADD CONSTRAINT "TaskAssignee_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "TaskAssignee_assigneeId_idx" ON "TaskAssignee"("assigneeId");
