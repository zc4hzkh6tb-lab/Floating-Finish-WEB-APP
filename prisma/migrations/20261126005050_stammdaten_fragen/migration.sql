-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'NUMBER', 'YESNO', 'SELECT');

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "customAnswers" JSONB;

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#f59e0b';

-- CreateTable
CREATE TABLE "VehicleClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehicleClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedSize" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LedSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomQuestion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "help" TEXT,
    "type" "QuestionType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleClass_name_key" ON "VehicleClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LedSize_label_key" ON "LedSize"("label");

-- Startfarben für bekannte Serien
UPDATE "Series" SET "color" = '#ef4444' WHERE "code" = 'DTTO';
UPDATE "Series" SET "color" = '#f97316' WHERE "code" = 'NTTM';
UPDATE "Series" SET "color" = '#3b82f6' WHERE "code" = 'ETPC';
UPDATE "Series" SET "color" = '#22c55e' WHERE "code" = 'GP';
UPDATE "Series" SET "color" = '#a855f7' WHERE "code" = 'ATPI';
