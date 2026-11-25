-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ANFRAGE', 'ANGEBOT', 'BESTAETIGT', 'IN_PLANUNG', 'DURCHGEFUEHRT', 'ABGERECHNET', 'ABGESAGT');

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCategory" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxPerspectives" INTEGER,
    "maxSpeakers" INTEGER,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddonCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AddonCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Addon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "priceHint" TEXT,
    "isLedWall" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageAddon" (
    "packageId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,

    CONSTRAINT "PackageAddon_pkey" PRIMARY KEY ("packageId","addonId")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'ANFRAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizer" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "eventName" TEXT NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "expectedVisitors" INTEGER,
    "classes" TEXT NOT NULL,
    "otherSeries" TEXT,
    "catering" TEXT,
    "accommodation" TEXT,
    "internet" TEXT,
    "notes" TEXT,
    "perspectives" INTEGER,
    "speakers" INTEGER,
    "ledPlayout" TEXT,
    "packageId" TEXT,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDay" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "BookingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSeries" (
    "bookingId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "BookingSeries_pkey" PRIMARY KEY ("bookingId","seriesId")
);

-- CreateTable
CREATE TABLE "BookingAddon" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,

    CONSTRAINT "BookingAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddonDay" (
    "bookingAddonId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "BookingAddonDay_pkey" PRIMARY KEY ("bookingAddonId","dayId")
);

-- CreateTable
CREATE TABLE "LedWallRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "placements" TEXT[],
    "hasMount" BOOLEAN NOT NULL,
    "mountInfo" TEXT,

    CONSTRAINT "LedWallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Series_code_key" ON "Series"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Package_code_key" ON "Package"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AddonCategory_code_key" ON "AddonCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Addon_code_key" ON "Addon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_number_key" ON "BookingRequest"("number");

-- CreateIndex
CREATE UNIQUE INDEX "LedWallRequest_bookingId_key" ON "LedWallRequest"("bookingId");

-- AddForeignKey
ALTER TABLE "Addon" ADD CONSTRAINT "Addon_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AddonCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAddon" ADD CONSTRAINT "PackageAddon_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAddon" ADD CONSTRAINT "PackageAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDay" ADD CONSTRAINT "BookingDay_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeries" ADD CONSTRAINT "BookingSeries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeries" ADD CONSTRAINT "BookingSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddon" ADD CONSTRAINT "BookingAddon_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddon" ADD CONSTRAINT "BookingAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddonDay" ADD CONSTRAINT "BookingAddonDay_bookingAddonId_fkey" FOREIGN KEY ("bookingAddonId") REFERENCES "BookingAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddonDay" ADD CONSTRAINT "BookingAddonDay_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BookingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedWallRequest" ADD CONSTRAINT "LedWallRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
