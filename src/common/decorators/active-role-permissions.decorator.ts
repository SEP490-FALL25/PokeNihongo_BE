import { REQUEST_ROLE_PERMISSIONS } from '@/common/constants/auth.constant'
import { RolePermissionsType } from '@/shared/models/shared-role.model'
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const ActiveRolePermissions = createParamDecorator(
  (field: keyof RolePermissionsType | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const rolePermissions: RolePermissionsType | undefined =
      request[REQUEST_ROLE_PERMISSIONS]
    return field ? rolePermissions?.[field] : rolePermissions
  }
)
