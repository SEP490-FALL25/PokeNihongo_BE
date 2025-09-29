import { RoleName } from '@/common/constants/role.constant'
import envConfig from '@/config/env.config'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'
const prisma = new PrismaService()
const hashingService = new HashingService()
const main = async () => {
  const roleCount = await prisma.role.count()

  if (roleCount > 0) {
    throw new Error('Roles already exist')
  }

  const roles = await prisma.role.createMany({
    data: [
      {
        name: RoleName.Admin,
        description: 'Admin role'
      },
      {
        name: RoleName.Customer,
        description: 'Customer role'
      }
    ]
  })

  const allRoles = await prisma.role.findMany()
  const roleMap = Object.fromEntries(allRoles.map((role) => [role.name, role]))

  const hashedPassword = await hashingService.hash(envConfig.ADMIN_PASSWORD)
  const accounts = await prisma.user.createMany({
    data: [
      {
        email: envConfig.ADMIN_EMAIL,
        password: hashedPassword,
        name: envConfig.ADMIN_NAME,
        phoneNumber: envConfig.PHONE_NUMBER,
        roleId: roleMap[RoleName.Admin].id
      }
      // {
      //   email: envConfig.MANAGER_EMAIL,
      //   password: hashedPassword,
      //   name: envConfig.MANAGER_NAME,
      //   phoneNumber: envConfig.PHONE_NUMBER,
      //   roleId: roleMap[RoleName.Manager].id
      // },
      // {
      //   email: envConfig.CHEF_EMAIL,
      //   password: hashedPassword,
      //   name: envConfig.CHEF_NAME,
      //   phoneNumber: envConfig.PHONE_NUMBER,
      //   roleId: roleMap[RoleName.Chef].id
      // },
      // {
      //   email: envConfig.STAFF_EMAIL,
      //   password: hashedPassword,
      //   name: envConfig.STAFF_NAME,
      //   phoneNumber: envConfig.PHONE_NUMBER,
      //   roleId: roleMap[RoleName.Staff].id
      // }
    ]
  })

  return {
    createdRoleCount: roles.count,
    createdAccountCount: accounts.count
  }
}

main()
  .then(({ createdAccountCount, createdRoleCount }) => {
    console.log(`Created ${createdRoleCount} roles`)
    console.log(`Created ${createdAccountCount} accounts`)
    console.log('🚀 Initial setup completed successfully.')
  })
  .catch(console.error)
