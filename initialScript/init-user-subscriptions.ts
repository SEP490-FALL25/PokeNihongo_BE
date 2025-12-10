import { RoleName } from '@/common/constants/role.constant'
import { InvoiceStatus, PAYMENT_METHOD, PAYMENT_STATUS } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { addTimeUTC } from '@/shared/helpers'

const prisma = new PrismaService()

/**
 * Script để init data cho phần user mua gói subscription:
 * - Lấy ngẫu nhiên 70% user có role là Learner
 * - Mỗi user sẽ mua toàn bộ gói trong subscriptionPlan (1, 2, 3)
 * - Nếu user đã mua gói đó và ACTIVE rồi thì bỏ qua
 * - Tạo Invoice(PAID), Payment(PAID), UserSubscription(ACTIVE)
 */
const main = async () => {
  try {
    console.log('🚀 Starting user subscription initialization...')

    // 1. Lấy tất cả users có role là Learner
    const learnerRole = await prisma.role.findFirst({
      where: {
        name: RoleName.Learner,
        deletedAt: null
      }
    })

    if (!learnerRole) {
      throw new Error('Learner role not found')
    }

    const allLearners = await prisma.user.findMany({
      where: {
        roleId: learnerRole.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    })

    console.log(`📊 Found ${allLearners.length} learners`)

    // 2. Chọn ngẫu nhiên 70% users
    const selectedCount = Math.floor(allLearners.length * 0.7)
    const shuffled = [...allLearners].sort(() => Math.random() - 0.5)
    const selectedLearners = shuffled.slice(0, selectedCount)

    console.log(`🎲 Selected ${selectedCount} learners (70%)`)

    // 3. Lấy thông tin các subscription plans (1, 2, 3)
    const subscriptionPlanIds = [1, 2, 3]
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        id: { in: subscriptionPlanIds },
        deletedAt: null
      }
    })

    if (plans.length !== subscriptionPlanIds.length) {
      const foundIds = plans.map((p) => p.id)
      const missingIds = subscriptionPlanIds.filter((id) => !foundIds.includes(id))
      throw new Error(`Subscription plans not found: ${missingIds.join(', ')}`)
    }

    console.log(`📦 Found ${plans.length} subscription plans`)

    let totalCreated = 0
    let totalSkipped = 0

    // 4. Với mỗi user, mua tất cả các gói
    for (const learner of selectedLearners) {
      for (const plan of plans) {
        // Kiểm tra xem user đã có subscription ACTIVE cho plan này chưa
        const existingActiveSub = await prisma.userSubscription.findFirst({
          where: {
            userId: learner.id,
            subscriptionPlanId: plan.id,
            status: UserSubscriptionStatus.ACTIVE,
            deletedAt: null
          }
        })

        // Nếu đã có subscription ACTIVE thì bỏ qua
        if (existingActiveSub) {
          totalSkipped++
          continue
        }

        // Tạo invoice, payment và user subscription trong transaction
        await prisma.$transaction(async (tx) => {
          const now = new Date()
          const startDate = addTimeUTC(now, 0)
          const expiresAt =
            plan.type === 'RECURRING' && plan.durationInDays
              ? addTimeUTC(startDate, plan.durationInDays * 24 * 60 * 60 * 1000)
              : null

          // Tạo Invoice với status PAID
          const invoice = await tx.invoice.create({
            data: {
              userId: learner.id,
              subscriptionPlanId: plan.id,
              subtotalAmount: plan.price,
              discountAmount: 0,
              totalAmount: plan.price,
              status: InvoiceStatus.PAID
            }
          })

          // Tạo Payment với status PAID
          await tx.payment.create({
            data: {
              userId: learner.id,
              invoiceId: invoice.id,
              paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
              amount: plan.price,
              status: PAYMENT_STATUS.PAID,
              paidAt: now
            }
          })

          // Tạo UserSubscription với status ACTIVE
          await tx.userSubscription.create({
            data: {
              userId: learner.id,
              subscriptionPlanId: plan.id,
              invoiceId: invoice.id,
              startDate,
              expiresAt,
              status: UserSubscriptionStatus.ACTIVE
            }
          })

          totalCreated++
        })
      }
    }

    console.log(`✅ Created ${totalCreated} subscriptions`)
    console.log(`⏭️  Skipped ${totalSkipped} existing subscriptions`)
    console.log('🎉 User subscription initialization completed successfully!')
  } catch (error) {
    console.error('❌ Error initializing user subscriptions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

