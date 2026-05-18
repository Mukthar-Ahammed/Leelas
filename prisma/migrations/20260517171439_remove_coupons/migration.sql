/*
  Warnings:

  - You are about to drop the column `couponId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Coupon` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_couponId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "couponId";

-- DropTable
DROP TABLE "Coupon";
