-- CreateTable
CREATE TABLE "UserPokemon" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,
    "nickname" TEXT,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPokemon_userId_idx" ON "UserPokemon"("userId");

-- CreateIndex
CREATE INDEX "UserPokemon_pokemonId_idx" ON "UserPokemon"("pokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPokemon_userId_nickname_key" ON "UserPokemon"("userId", "nickname");

-- AddForeignKey
ALTER TABLE "UserPokemon" ADD CONSTRAINT "UserPokemon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPokemon" ADD CONSTRAINT "UserPokemon_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPokemon" ADD CONSTRAINT "UserPokemon_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
