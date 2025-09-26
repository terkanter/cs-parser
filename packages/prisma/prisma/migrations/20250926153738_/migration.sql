/*
  Warnings:

  - The values [STEAM,BUFF163,SKINPORT,DMARKET] on the enum `platforms` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."platforms_new" AS ENUM ('LIS_SKINS', 'CS_MONEY');
ALTER TABLE "public"."buy_requests" ALTER COLUMN "platform" TYPE "public"."platforms_new" USING ("platform"::text::"public"."platforms_new");
ALTER TYPE "public"."platforms" RENAME TO "platforms_old";
ALTER TYPE "public"."platforms_new" RENAME TO "platforms";
DROP TYPE "public"."platforms_old";
COMMIT;
