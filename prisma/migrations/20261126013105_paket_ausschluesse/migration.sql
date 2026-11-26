-- CreateTable
CREATE TABLE "PackageExcludedAddon" (
    "packageId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,

    CONSTRAINT "PackageExcludedAddon_pkey" PRIMARY KEY ("packageId","addonId")
);

-- AddForeignKey
ALTER TABLE "PackageExcludedAddon" ADD CONSTRAINT "PackageExcludedAddon_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageExcludedAddon" ADD CONSTRAINT "PackageExcludedAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
