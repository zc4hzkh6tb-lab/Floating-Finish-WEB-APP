-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "internalNotes" TEXT;

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
