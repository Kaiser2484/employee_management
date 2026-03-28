-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "employeeStatus" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "jobCategory" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
