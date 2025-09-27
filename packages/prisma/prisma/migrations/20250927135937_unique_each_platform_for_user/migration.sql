/*
  Warnings:

  - A unique constraint covering the columns `[platform,userId]` on the table `platform_account` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "platform_account_platform_userId_key" ON "public"."platform_account"("platform", "userId");
