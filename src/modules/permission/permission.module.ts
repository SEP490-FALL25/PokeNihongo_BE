import { Module } from '@nestjs/common'
import { PermissionController } from 'src/modules/permission/permission.controller'
import { PermissionRepo } from 'src/modules/permission/permission.repo'
import { PermissionService } from 'src/modules/permission/permission.service'

@Module({
  providers: [PermissionService, PermissionRepo],
  controllers: [PermissionController],
  exports: [PermissionService, PermissionRepo]
})
export class PermissionModule {}
