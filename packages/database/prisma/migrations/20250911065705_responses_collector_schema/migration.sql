-- CreateEnum
CREATE TYPE "CollectorType" AS ENUM ('PUBLIC', 'SINGLE_USE', 'INTERNAL', 'PANEL');

-- AlterTable
ALTER TABLE "SurveySession" ADD COLUMN     "collectorId" TEXT,
ADD COLUMN     "inviteId" TEXT;

-- CreateTable
CREATE TABLE "SurveyCollector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "type" "CollectorType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "maxResponses" INTEGER,
    "allowMultiplePerDevice" BOOLEAN NOT NULL DEFAULT false,
    "allowTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyCollector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorInvite" (
    "id" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "externalId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyCollector_slug_key" ON "SurveyCollector"("slug");

-- CreateIndex
CREATE INDEX "SurveyCollector_tenantId_surveyId_idx" ON "SurveyCollector"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "SurveyCollector_slug_idx" ON "SurveyCollector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyCollector_tenantId_slug_key" ON "SurveyCollector"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollectorInvite_token_key" ON "CollectorInvite"("token");

-- CreateIndex
CREATE INDEX "CollectorInvite_collectorId_idx" ON "CollectorInvite"("collectorId");

-- CreateIndex
CREATE INDEX "CollectorInvite_token_idx" ON "CollectorInvite"("token");

-- CreateIndex
CREATE INDEX "CollectorInvite_email_idx" ON "CollectorInvite"("email");

-- CreateIndex
CREATE INDEX "SurveySession_collectorId_idx" ON "SurveySession"("collectorId");

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "SurveyCollector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyCollector" ADD CONSTRAINT "SurveyCollector_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorInvite" ADD CONSTRAINT "CollectorInvite_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "SurveyCollector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
