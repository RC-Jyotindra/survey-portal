-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'DATE', 'TIME', 'BOOLEAN', 'RANK', 'SLIDER', 'MATRIX', 'DESCRIPTIVE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED');

-- CreateEnum
CREATE TYPE "OptionsSource" AS ENUM ('STATIC', 'CARRY_FORWARD');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'TERMINATED');

-- CreateTable
CREATE TABLE "Expression" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "dsl" TEXT NOT NULL,
    "description" TEXT,
    "compiled" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "defaultLanguage" TEXT,
    "settings" JSONB,
    "createdByUserId" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "questionOrderMode" "OrderMode" NOT NULL DEFAULT 'SEQUENTIAL',
    "visibleIfExpressionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "variableName" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "helpTextTemplate" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "validation" JSONB,
    "optionOrderMode" "OrderMode" NOT NULL DEFAULT 'SEQUENTIAL',
    "optionsSource" "OptionsSource" NOT NULL DEFAULT 'STATIC',
    "carryForwardQuestionId" TEXT,
    "carryForwardFilterExprId" TEXT,
    "visibleIfExpressionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "labelTemplate" TEXT NOT NULL,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "groupKey" TEXT,
    "weight" INTEGER,
    "visibleIfExpressionId" TEXT,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "QuestionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionScale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "QuestionScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageJump" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "fromPageId" TEXT NOT NULL,
    "toPageId" TEXT NOT NULL,
    "conditionExpressionId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageJump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionJump" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "fromQuestionId" TEXT NOT NULL,
    "toPageId" TEXT,
    "toQuestionId" TEXT,
    "conditionExpressionId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionJump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "locale" TEXT,
    "source" TEXT,
    "meta" JSONB,
    "renderState" JSONB,

    CONSTRAINT "SurveySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textValue" TEXT,
    "numericValue" INTEGER,
    "decimalValue" DECIMAL(65,30),
    "dateValue" TIMESTAMP(3),
    "timeValue" TIMESTAMP(3),
    "jsonValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expression_tenantId_surveyId_idx" ON "Expression"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "Survey_tenantId_status_idx" ON "Survey"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_tenantId_slug_key" ON "Survey"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "SurveyPage_tenantId_surveyId_idx" ON "SurveyPage"("tenantId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyPage_surveyId_index_key" ON "SurveyPage"("surveyId", "index");

-- CreateIndex
CREATE INDEX "Question_tenantId_surveyId_idx" ON "Question"("tenantId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_surveyId_variableName_key" ON "Question"("surveyId", "variableName");

-- CreateIndex
CREATE UNIQUE INDEX "Question_pageId_index_key" ON "Question"("pageId", "index");

-- CreateIndex
CREATE INDEX "QuestionOption_tenantId_surveyId_idx" ON "QuestionOption"("tenantId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_index_key" ON "QuestionOption"("questionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_value_key" ON "QuestionOption"("questionId", "value");

-- CreateIndex
CREATE INDEX "QuestionItem_tenantId_surveyId_idx" ON "QuestionItem"("tenantId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionItem_questionId_index_key" ON "QuestionItem"("questionId", "index");

-- CreateIndex
CREATE INDEX "QuestionScale_tenantId_surveyId_idx" ON "QuestionScale"("tenantId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionScale_questionId_index_key" ON "QuestionScale"("questionId", "index");

-- CreateIndex
CREATE INDEX "PageJump_tenantId_surveyId_fromPageId_idx" ON "PageJump"("tenantId", "surveyId", "fromPageId");

-- CreateIndex
CREATE INDEX "PageJump_tenantId_surveyId_toPageId_idx" ON "PageJump"("tenantId", "surveyId", "toPageId");

-- CreateIndex
CREATE INDEX "QuestionJump_tenantId_surveyId_fromQuestionId_idx" ON "QuestionJump"("tenantId", "surveyId", "fromQuestionId");

-- CreateIndex
CREATE INDEX "SurveySession_tenantId_surveyId_status_idx" ON "SurveySession"("tenantId", "surveyId", "status");

-- CreateIndex
CREATE INDEX "Answer_tenantId_surveyId_sessionId_idx" ON "Answer"("tenantId", "surveyId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_questionId_key" ON "Answer"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "Expression" ADD CONSTRAINT "Expression_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyPage" ADD CONSTRAINT "SurveyPage_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyPage" ADD CONSTRAINT "SurveyPage_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_carryForwardFilterExprId_fkey" FOREIGN KEY ("carryForwardFilterExprId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionItem" ADD CONSTRAINT "QuestionItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionScale" ADD CONSTRAINT "QuestionScale_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJump" ADD CONSTRAINT "PageJump_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJump" ADD CONSTRAINT "PageJump_fromPageId_fkey" FOREIGN KEY ("fromPageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJump" ADD CONSTRAINT "PageJump_toPageId_fkey" FOREIGN KEY ("toPageId") REFERENCES "SurveyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJump" ADD CONSTRAINT "PageJump_conditionExpressionId_fkey" FOREIGN KEY ("conditionExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJump" ADD CONSTRAINT "QuestionJump_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJump" ADD CONSTRAINT "QuestionJump_fromQuestionId_fkey" FOREIGN KEY ("fromQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJump" ADD CONSTRAINT "QuestionJump_toPageId_fkey" FOREIGN KEY ("toPageId") REFERENCES "SurveyPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJump" ADD CONSTRAINT "QuestionJump_toQuestionId_fkey" FOREIGN KEY ("toQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJump" ADD CONSTRAINT "QuestionJump_conditionExpressionId_fkey" FOREIGN KEY ("conditionExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
