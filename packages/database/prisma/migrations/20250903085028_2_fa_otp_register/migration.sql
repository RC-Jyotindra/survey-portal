-- CreateTable
CREATE TABLE "SignupIntent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tenantName" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "productCode" "ProductCode" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "signupIntentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupIntent_email_idx" ON "SignupIntent"("email");

-- CreateIndex
CREATE INDEX "SignupIntent_status_idx" ON "SignupIntent"("status");

-- CreateIndex
CREATE INDEX "SignupIntent_expiresAt_idx" ON "SignupIntent"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailOtp_signupIntentId_idx" ON "EmailOtp"("signupIntentId");

-- CreateIndex
CREATE INDEX "EmailOtp_purpose_idx" ON "EmailOtp"("purpose");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_signupIntentId_fkey" FOREIGN KEY ("signupIntentId") REFERENCES "SignupIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
