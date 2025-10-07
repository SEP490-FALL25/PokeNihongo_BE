-- DropForeignKey
ALTER TABLE "Pokemon" DROP CONSTRAINT "Pokemon_nextPokemonId_fkey";

-- CreateTable
CREATE TABLE "_PokemonEvolutions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PokemonEvolutions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PokemonEvolutions_B_index" ON "_PokemonEvolutions"("B");

-- AddForeignKey
ALTER TABLE "_PokemonEvolutions" ADD CONSTRAINT "_PokemonEvolutions_A_fkey" FOREIGN KEY ("A") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PokemonEvolutions" ADD CONSTRAINT "_PokemonEvolutions_B_fkey" FOREIGN KEY ("B") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
