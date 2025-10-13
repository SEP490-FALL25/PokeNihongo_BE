import { Module } from '@nestjs/common'
import { DailyRequestModule } from '../daily-request/daily-request.module'
import { LanguagesModule } from '../languages/languages.module'
import { UserDailyRequestController } from './user-daily-request.controller'
import { UserDailyRequestRepo } from './user-daily-request.repo'
import { UserDailyRequestService } from './user-daily-request.service'

@Module({
  imports: [DailyRequestModule, LanguagesModule],
  controllers: [UserDailyRequestController],
  providers: [UserDailyRequestService, UserDailyRequestRepo]
})
export class UserDailyRequestModule {}

/*
Đọc qua: daily request module, user daily request module translation module
Yêu cầu:
  trả ra danh sach daily request của user hôm nay, nếu chưa có thì tạo mới
  mỗi daily request trả về kèm theo thông tin bản dịch nameTranslation, descriptionTranslation
  tìm trong bảng translations với key là nameKey, descriptionKey, languageId tôi đã chuẩn bị.
  return sẽ là UserDailyRequestDetailType[]

  giúp tôi lấy ra toàn bộ user daily request của user hôm nay, bao gồm cả thông tin user
  Với daily request thì lấy tất cả các trường, kèm cả nameTranslation, descriptionTranslation bằng cách vào
  translations lấy các bản dịch tương ứng với langId và key từ nameKey và descriptionKey của mỗi daily request
  nếu user thiếu daily request nào trong ngày thì sẽ tự động tạo mới theo logic của async create ở tầng service


 */
