-- Add primary degree field to users
ALTER TABLE "User" ADD COLUMN "degree" TEXT NOT NULL DEFAULT '';
