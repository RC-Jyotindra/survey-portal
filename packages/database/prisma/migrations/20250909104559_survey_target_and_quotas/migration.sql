/*
  Warnings:

  - A unique constraint covering the columns `[groupId,groupIndex]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "QuotaStrategy" AS ENUM ('MANUAL', 'EQUAL', 'RANDOM');

-- CreateEnum
CREATE TYPE "QuotaState" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupIndex" INTEGER;

-- AlterTable
ALTER TABLE "SurveyPage" ADD COLUMN     "groupOrderMode" "OrderMode" NOT NULL DEFAULT 'SEQUENTIAL';

-- CreateTable
CREATE TABLE "SurveyTarget" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "totalN" INTEGER NOT NULL,
    "softCloseN" INTEGER,
    "hardClose" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaPlan" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" "QuotaStrategy" NOT NULL DEFAULT 'MANUAL',
    "totalN" INTEGER NOT NULL,
    "state" "QuotaState" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaBucket" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "questionId" TEXT,
    "optionValue" TEXT,
    "conditionExprId" TEXT,
    "targetN" INTEGER NOT NULL,
    "filledN" INTEGER NOT NULL DEFAULT 0,
    "reservedN" INTEGER NOT NULL DEFAULT 0,
    "maxOverfill" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaReservation" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageQuestionGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "key" TEXT,
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "visibleIfExpressionId" TEXT,
    "innerOrderMode" "OrderMode" NOT NULL DEFAULT 'SEQUENTIAL',

    CONSTRAINT "PageQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyTarget_surveyId_key" ON "SurveyTarget"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyTarget_tenantId_surveyId_idx" ON "SurveyTarget"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "QuotaPlan_tenantId_surveyId_idx" ON "QuotaPlan"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "QuotaBucket_planId_idx" ON "QuotaBucket"("planId");

-- CreateIndex
CREATE INDEX "QuotaBucket_tenantId_planId_idx" ON "QuotaBucket"("tenantId", "planId");

-- CreateIndex
CREATE INDEX "QuotaReservation_bucketId_status_idx" ON "QuotaReservation"("bucketId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaReservation_sessionId_bucketId_key" ON "QuotaReservation"("sessionId", "bucketId");

-- CreateIndex
CREATE INDEX "PageQuestionGroup_tenantId_surveyId_pageId_idx" ON "PageQuestionGroup"("tenantId", "surveyId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageQuestionGroup_pageId_index_key" ON "PageQuestionGroup"("pageId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Question_groupId_groupIndex_key" ON "Question"("groupId", "groupIndex");

-- AddForeignKey
ALTER TABLE "SurveyTarget" ADD CONSTRAINT "SurveyTarget_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaPlan" ADD CONSTRAINT "QuotaPlan_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaBucket" ADD CONSTRAINT "QuotaBucket_planId_fkey" FOREIGN KEY ("planId") REFERENCES "QuotaPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaBucket" ADD CONSTRAINT "QuotaBucket_conditionExprId_fkey" FOREIGN KEY ("conditionExprId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaReservation" ADD CONSTRAINT "QuotaReservation_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "QuotaBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaReservation" ADD CONSTRAINT "QuotaReservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PageQuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageQuestionGroup" ADD CONSTRAINT "PageQuestionGroup_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageQuestionGroup" ADD CONSTRAINT "PageQuestionGroup_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;
