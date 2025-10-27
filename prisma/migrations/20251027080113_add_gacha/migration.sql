-- CreateEnum
CREATE TYPE "GachaStarType" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE');

-- CreateEnum
CREATE TYPE "GachaPityType" AS ENUM ('PENDING', 'COMPLETED_MAX', 'COMPLETED_LUCK');

-- CreateTable
CREATE TABLE "GachaBanner" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'PREVIEW',
    "hardPity5Star" INTEGER NOT NULL DEFAULT 200,
    "costRoll" INTEGER NOT NULL DEFAULT 100,
    "amount5Star" INTEGER NOT NULL DEFAULT 1,
    "amount4Star" INTEGER NOT NULL DEFAULT 3,
    "amount3Star" INTEGER NOT NULL DEFAULT 6,
    "amount2Star" INTEGER NOT NULL DEFAULT 8,
    "amount1Star" INTEGER NOT NULL DEFAULT 10,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaItemRate" (
    "id" SERIAL NOT NULL,
    "starType" "GachaStarType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaItemRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaBannerItem" (
    "id" SERIAL NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "gachaItemRateId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaBannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaPurchase" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "walletTransId" INTEGER,
    "pityId" INTEGER,
    "rollCount" INTEGER NOT NULL DEFAULT 1,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "rolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaRollHistory" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "rarity" "GachaStarType" NOT NULL,
    "isPity" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaRollHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGachaPity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pityCount" INTEGER NOT NULL,
    "status" "GachaPityType" NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGachaPity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GachaBannerItem_bannerId_pokemonId_key" ON "GachaBannerItem"("bannerId", "pokemonId");

-- AddForeignKey
ALTER TABLE "GachaBanner" ADD CONSTRAINT "GachaBanner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaBanner" ADD CONSTRAINT "GachaBanner_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaBanner" ADD CONSTRAINT "GachaBanner_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaItemRate" ADD CONSTRAINT "GachaItemRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaItemRate" ADD CONSTRAINT "GachaItemRate_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaItemRate" ADD CONSTRAINT "GachaItemRate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "GachaBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_gachaItemRateId_fkey" FOREIGN KEY ("gachaItemRateId") REFERENCES "GachaItemRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaBannerItem" ADD CONSTRAINT "GachaBannerItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "GachaBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_walletTransId_fkey" FOREIGN KEY ("walletTransId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_pityId_fkey" FOREIGN KEY ("pityId") REFERENCES "UserGachaPity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "GachaPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "GachaBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
