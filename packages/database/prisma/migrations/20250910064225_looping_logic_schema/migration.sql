-- CreateEnum
CREATE TYPE "LoopSourceType" AS ENUM ('ANSWER', 'DATASET');

-- CreateTable
CREATE TABLE "LoopBattery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startPageId" TEXT NOT NULL,
    "endPageId" TEXT NOT NULL,
    "sourceType" "LoopSourceType" NOT NULL,
    "sourceQuestionId" TEXT,
    "maxItems" INTEGER,
    "randomize" BOOLEAN NOT NULL DEFAULT true,
    "sampleWithoutReplacement" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoopBattery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopDatasetItem" (
    "id" TEXT NOT NULL,
    "batteryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER,

    CONSTRAINT "LoopDatasetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoopBattery_tenantId_surveyId_idx" ON "LoopBattery"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "LoopDatasetItem_batteryId_idx" ON "LoopDatasetItem"("batteryId");

-- CreateIndex
CREATE UNIQUE INDEX "LoopDatasetItem_batteryId_key_key" ON "LoopDatasetItem"("batteryId", "key");

-- AddForeignKey
ALTER TABLE "LoopBattery" ADD CONSTRAINT "LoopBattery_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopBattery" ADD CONSTRAINT "LoopBattery_startPageId_fkey" FOREIGN KEY ("startPageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopBattery" ADD CONSTRAINT "LoopBattery_endPageId_fkey" FOREIGN KEY ("endPageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopBattery" ADD CONSTRAINT "LoopBattery_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopDatasetItem" ADD CONSTRAINT "LoopDatasetItem_batteryId_fkey" FOREIGN KEY ("batteryId") REFERENCES "LoopBattery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
