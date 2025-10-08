-- CreateTable
CREATE TABLE "public"."telegram_callback_data" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_callback_data_pkey" PRIMARY KEY ("id")
);
