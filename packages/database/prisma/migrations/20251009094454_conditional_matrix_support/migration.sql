-- AlterTable
ALTER TABLE "QuestionItem" ADD COLUMN     "visibleIfExpressionId" TEXT;

-- AlterTable
ALTER TABLE "QuestionScale" ADD COLUMN     "visibleIfExpressionId" TEXT;

-- AddForeignKey
ALTER TABLE "QuestionItem" ADD CONSTRAINT "QuestionItem_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionScale" ADD CONSTRAINT "QuestionScale_visibleIfExpressionId_fkey" FOREIGN KEY ("visibleIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;
