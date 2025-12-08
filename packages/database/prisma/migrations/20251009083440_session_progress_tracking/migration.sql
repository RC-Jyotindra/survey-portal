-- AlterTable
ALTER TABLE "SurveySession" ADD COLUMN     "currentPageId" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "progressData" JSONB,
ADD COLUMN     "resumeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resumeToken" TEXT;
