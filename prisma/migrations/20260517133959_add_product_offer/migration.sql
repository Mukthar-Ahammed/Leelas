-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "offerEndsAt" TIMESTAMP(3),
ADD COLUMN     "offerPercent" INTEGER,
ADD COLUMN     "offerStartsAt" TIMESTAMP(3);
