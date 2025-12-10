import { LeaderboardSeasonRepo } from '@/modules/leaderboard-season/leaderboard-season.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { ManualLeaderboardSeasonRotation } from './manual-leaderboard-season-rotation'

/**
 * Script để rotate leaderboard season thủ công
 * Chạy: npx ts-node -r tsconfig-paths/register initialScript/run-manual-rotation.ts
 */
async function main() {
  const prisma = new PrismaService()
  const leaderboardRepo = new LeaderboardSeasonRepo(prisma)

  const rotation = new ManualLeaderboardSeasonRotation(prisma, leaderboardRepo)

  try {
    await rotation.execute()
    console.log('\n✅ Season rotation completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Season rotation failed:', error, '\n')
  } finally {
    await prisma.$disconnect()
  }
}

main()
