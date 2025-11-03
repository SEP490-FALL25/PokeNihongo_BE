import { Module } from '@nestjs/common'
import { RoleController } from 'src/modules/role/role.controller'
import { RoleRepo } from 'src/modules/role/role.repo'
import { RoleService } from 'src/modules/role/role.service'
import { PermissionModule } from '../permission/permission.module'

@Module({
  imports: [PermissionModule],
  providers: [RoleService, RoleRepo],
  controllers: [RoleController],
  exports: [RoleService]
})
export class RoleModule {}
