-- CreateTable
CREATE TABLE "ShopRarityPrice" (
    "id" SERIAL NOT NULL,
    "rarity" "RarityPokemon" NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 1000,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRarityPrice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShopRarityPrice" ADD CONSTRAINT "ShopRarityPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopRarityPrice" ADD CONSTRAINT "ShopRarityPrice_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopRarityPrice" ADD CONSTRAINT "ShopRarityPrice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
