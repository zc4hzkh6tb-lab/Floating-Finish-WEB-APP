-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANUNG', 'TEAM');

-- CreateEnum
CREATE TYPE "StaffRequestStatus" AS ENUM ('OFFEN', 'ZUGESAGT', 'ABGESAGT', 'ZURUECKGEZOGEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TEAM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT,
    "skills" TEXT,
    "bio" TEXT,
    "icalToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "message" TEXT,
    "status" "StaffRequestStatus" NOT NULL DEFAULT 'OFFEN',
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "StaffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRequestDay" (
    "staffRequestId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "StaffRequestDay_pkey" PRIMARY KEY ("staffRequestId","dayId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_icalToken_key" ON "User"("icalToken");

-- AddForeignKey
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequestDay" ADD CONSTRAINT "StaffRequestDay_staffRequestId_fkey" FOREIGN KEY ("staffRequestId") REFERENCES "StaffRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequestDay" ADD CONSTRAINT "StaffRequestDay_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BookingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
