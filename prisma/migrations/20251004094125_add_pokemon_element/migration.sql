-- CreateTable
CREATE TABLE "Pokemon" (
    "id" SERIAL NOT NULL,
    "pokedex_number" INTEGER NOT NULL,
    "name_jp" TEXT,
    "name_translations" JSONB NOT NULL,
    "description" TEXT,
    "condition_level" INTEGER,
    "next_pokemon_id" INTEGER,
    "is_started" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "rarity" TEXT,
    "base_exp" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementalType" (
    "id" SERIAL NOT NULL,
    "type_name" VARCHAR(20) NOT NULL,
    "display_name" JSONB NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementalType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeEffectiveness" (
    "id" SERIAL NOT NULL,
    "attackerId" INTEGER NOT NULL,
    "defenderId" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeEffectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ElementalTypeToPokemon" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ElementalTypeToPokemon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElementalType_type_name_key" ON "ElementalType"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "TypeEffectiveness_attackerId_defenderId_key" ON "TypeEffectiveness"("attackerId", "defenderId");

-- CreateIndex
CREATE INDEX "_ElementalTypeToPokemon_B_index" ON "_ElementalTypeToPokemon"("B");

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_next_pokemon_id_fkey" FOREIGN KEY ("next_pokemon_id") REFERENCES "Pokemon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ElementalType" ADD CONSTRAINT "ElementalType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ElementalType" ADD CONSTRAINT "ElementalType_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ElementalType" ADD CONSTRAINT "ElementalType_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "ElementalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "ElementalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_ElementalTypeToPokemon" ADD CONSTRAINT "_ElementalTypeToPokemon_A_fkey" FOREIGN KEY ("A") REFERENCES "ElementalType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ElementalTypeToPokemon" ADD CONSTRAINT "_ElementalTypeToPokemon_B_fkey" FOREIGN KEY ("B") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
