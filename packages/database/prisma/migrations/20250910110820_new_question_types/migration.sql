-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'YES_NO';
ALTER TYPE "QuestionType" ADD VALUE 'EMAIL';
ALTER TYPE "QuestionType" ADD VALUE 'PHONE_NUMBER';
ALTER TYPE "QuestionType" ADD VALUE 'WEBSITE';
ALTER TYPE "QuestionType" ADD VALUE 'OPINION_SCALE';
ALTER TYPE "QuestionType" ADD VALUE 'CONSTANT_SUM';
ALTER TYPE "QuestionType" ADD VALUE 'DATETIME';
ALTER TYPE "QuestionType" ADD VALUE 'BIPOLAR_MATRIX';
ALTER TYPE "QuestionType" ADD VALUE 'GROUP_RANK';
ALTER TYPE "QuestionType" ADD VALUE 'GROUP_RATING';
ALTER TYPE "QuestionType" ADD VALUE 'PHOTO_CAPTURE';
ALTER TYPE "QuestionType" ADD VALUE 'PICTURE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'PAYMENT';
ALTER TYPE "QuestionType" ADD VALUE 'SIGNATURE';
ALTER TYPE "QuestionType" ADD VALUE 'CONSENT_AGREEMENT';
ALTER TYPE "QuestionType" ADD VALUE 'MESSAGE';
ALTER TYPE "QuestionType" ADD VALUE 'CONTACT_FORM';

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "booleanValue" BOOLEAN,
ADD COLUMN     "emailValue" TEXT,
ADD COLUMN     "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "phoneValue" TEXT,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "urlValue" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "allowOther" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowZero" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "collectAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectCompany" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "collectName" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "collectPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentText" TEXT,
ADD COLUMN     "countryCode" TEXT DEFAULT 'US',
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "dateFormat" TEXT,
ADD COLUMN     "defaultValue" DECIMAL(65,30),
ADD COLUMN     "groupLabel" TEXT,
ADD COLUMN     "groupSize" INTEGER DEFAULT 3,
ADD COLUMN     "imageLayout" TEXT DEFAULT 'grid',
ADD COLUMN     "imageSize" TEXT DEFAULT 'medium',
ADD COLUMN     "matrixType" TEXT DEFAULT 'single',
ADD COLUMN     "maxDate" TIMESTAMP(3),
ADD COLUMN     "maxFileSize" INTEGER,
ADD COLUMN     "maxFiles" INTEGER DEFAULT 1,
ADD COLUMN     "maxSelections" INTEGER,
ADD COLUMN     "maxValue" DECIMAL(65,30),
ADD COLUMN     "minDate" TIMESTAMP(3),
ADD COLUMN     "minValue" DECIMAL(65,30),
ADD COLUMN     "otherLabel" TEXT,
ADD COLUMN     "paymentAmount" DECIMAL(65,30),
ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY['card']::TEXT[],
ADD COLUMN     "phoneFormat" TEXT,
ADD COLUMN     "randomizeColumns" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "randomizeRows" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scaleMaxLabel" TEXT,
ADD COLUMN     "scaleMinLabel" TEXT,
ADD COLUMN     "scaleSteps" INTEGER,
ADD COLUMN     "showHeaders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "signatureColor" TEXT DEFAULT '#000000',
ADD COLUMN     "signatureHeight" INTEGER DEFAULT 200,
ADD COLUMN     "signatureWidth" INTEGER DEFAULT 400,
ADD COLUMN     "stepValue" DECIMAL(65,30),
ADD COLUMN     "timeFormat" TEXT,
ADD COLUMN     "totalPoints" INTEGER DEFAULT 100,
ADD COLUMN     "urlProtocol" TEXT DEFAULT 'https';

-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "imageWidth" INTEGER;
