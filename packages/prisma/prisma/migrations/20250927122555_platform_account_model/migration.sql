/*
  Warnings:

  - You are about to drop the column `created_at` on the `buy_requests` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `buy_requests` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `buy_requests` table. All the data in the column will be lost.
  - You are about to drop the column `liskinsApiKey` on the `user` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `buy_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."buy_requests" DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "liskinsApiKey";

-- CreateTable
CREATE TABLE "public"."platform_account" (
    "id" TEXT NOT NULL,
    "platform" "public"."platforms" NOT NULL,
    "credentials" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "platform_account_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."platform_account" ADD CONSTRAINT "platform_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
