-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "terminateIfExpressionId" TEXT;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_terminateIfExpressionId_fkey" FOREIGN KEY ("terminateIfExpressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;
