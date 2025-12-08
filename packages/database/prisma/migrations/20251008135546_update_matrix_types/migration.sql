/*
  Warnings:

  - The values [MATRIX] on the enum `QuestionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionType_new" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'YES_NO', 'TEXT', 'TEXTAREA', 'EMAIL', 'PHONE_NUMBER', 'WEBSITE', 'NUMBER', 'DECIMAL', 'SLIDER', 'OPINION_SCALE', 'CONSTANT_SUM', 'DATE', 'TIME', 'BOOLEAN', 'DATETIME', 'RANK', 'MATRIX_SINGLE', 'MATRIX_MULTIPLE', 'BIPOLAR_MATRIX', 'GROUP_RANK', 'GROUP_RATING', 'FILE_UPLOAD', 'PHOTO_CAPTURE', 'PICTURE_CHOICE', 'PAYMENT', 'SIGNATURE', 'CONSENT_AGREEMENT', 'MESSAGE', 'CONTACT_FORM', 'DESCRIPTIVE');
ALTER TABLE "Question" ALTER COLUMN "type" TYPE "QuestionType_new" USING ("type"::text::"QuestionType_new");
ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
ALTER TYPE "QuestionType_new" RENAME TO "QuestionType";
DROP TYPE "QuestionType_old";
COMMIT;
