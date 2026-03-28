-- Add email/password for auth
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Enforce unique emails while allowing NULLs
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Allow rejected leave requests and reasons
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TABLE "LeaveRequest" ADD COLUMN "reason" TEXT;
