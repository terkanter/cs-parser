/*
  Warnings:

  - Added the required column `createdByUserId` to the `buy_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."buy_requests" ADD COLUMN     "createdByUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "liskinsApiKey" TEXT;

-- AddForeignKey
ALTER TABLE "public"."buy_requests" ADD CONSTRAINT "buy_requests_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
