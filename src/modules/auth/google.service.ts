import envConfig from '@/config/env.config'
import { AuthRepository } from '@/modules/auth/auth.repo'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { UserTestService } from '@/modules/user-test/user-test.service'
import { SharedRoleRepository } from '@/shared/repositories/shared-role.repo'
import { Injectable } from '@nestjs/common'
import { google } from 'googleapis'
import { AuthService } from 'src/modules/auth/auth.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { v4 as uuidv4 } from 'uuid'
import { GoogleUserInfoException } from './dto/auth.error'
import { GoogleAuthStateType } from './entities/auth.entities'
@Injectable()
export class GoogleService {
  private oauth2Client
  constructor(
    private readonly hashingService: HashingService,
    private readonly authService: AuthService,
    private readonly authRepository: AuthRepository,
    private readonly sharedRoleRepo: SharedRoleRepository,
    private readonly userProgressService: UserProgressService,
    private readonly userTestService: UserTestService
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      envConfig.GOOGLE_CLIENT_ID,
      envConfig.GOOGLE_CLIENT_SECRET,
      envConfig.GOOGLE_REDIRECT_URI
    )
  }
  getAuthorizationUrl({ userAgent, ip }: GoogleAuthStateType) {
    const scope = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
    const stateString = Buffer.from(JSON.stringify({ userAgent, ip })).toString('base64')
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope,
      include_granted_scopes: true,
      state: stateString
    })
    return { data: { url }, message: 'Lấy URL đăng nhập Google thành công' }
  }

  async googleCallback({ code, state }: { code: string; state: string }) {
    try {
      let userAgent = 'Unknown'
      let ip = 'Unknown'
      // 1. Lấy state từ query params
      try {
        if (state) {
          const clientInfo = JSON.parse(
            Buffer.from(state, 'base64').toString()
          ) as GoogleAuthStateType
          userAgent = clientInfo.userAgent
          ip = clientInfo.ip
        }
      } catch (error) {
        console.error('Error parsing state:', error)
      }

      // 2. Dùng code để lấy token
      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      // 3. Lấy thông tin google user
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      })
      const { data } = await oauth2.userinfo.get()
      if (!data.email) {
        throw new GoogleUserInfoException()
      }

      let user = await this.authRepository.findUniqueUserIncludeRole({
        email: data.email
      })
      // Nếu không có user tức là người mới = customer, vậy nên sẽ tiến hành đăng ký
      if (!user) {
        const randomPassword = uuidv4()
        const hashedPassword = await this.hashingService.hash(randomPassword)
        const roleId = await this.sharedRoleRepo.getCustomerRoleId()
        const createdUser = await this.authRepository.createUserInclueRole({
          email: data.email,
          name: data.name ?? '',
          password: hashedPassword,
          phoneNumber: '', // Set to null instead of empty string
          roleId: roleId,
          avatar: data.picture ?? null
        })
        user = {
          ...createdUser,
          password: hashedPassword
        }

        // Khởi tạo UserProgress cho user mới (chỉ khi tạo user mới)
        await this.userProgressService.initUserProgress(user.id)

        // Khởi tạo UserTest cho tất cả test miễn phí (price = 0 và status = ACTIVE)
        await this.userTestService.initUserTests(user.id)
      }
      // 4. Tạo mới device
      const device = await this.authRepository.createDevice({
        userId: user.id,
        userAgent: userAgent,
        ip: ip
      })
      const authTokens = await this.authService.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: user.role.name
      })
      return authTokens
    } catch (error) {
      console.error('Error in googleCallback', error)
      throw error
    }
  }
}
