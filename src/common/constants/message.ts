export const AUTH_MESSAGE = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  FORGOT_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
  UPDATE_PROFILE_SUCCESS: 'Cập nhật thông tin cá nhân thành công',
  PHONE_IS_INVALID: 'Số điện thoại không hợp lệ',
  NAME_IS_REQUIRED: 'Tên không được để trống',
  REFRESH_TOKEN_SUCCESS: 'Làm mới token thành công',
  INVALID_OTP: 'Mã OTP không hợp lệ hoặc hết hạn',
  OTP_EXPIRED: 'Mã OTP đã hết hạn',
  FAILED_TO_SEND_OTP: 'Gửi mã OTP thất bại',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  NOT_FOUND_EMAIL: 'Không tìm thấy email',
  EMAIL_INACTIVE: 'Email chưa được kích hoạt',
  EMAIL_ACTIVE: 'Email đã được kích hoạt',
  REFRESH_TOKEN_ALREADY_USED: 'Token làm mới đã được sử dụng',
  UNAUTHORIZED_ACCESS: 'Truy cập không được phép',
  ACCOUNT_IS_BANNED: 'Tài khoản đã bị khóa',
  FAILD_TO_GET_GOOGLE_USER_INFO: 'Lấy thông tin người dùng Google thất bại',
  RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
  SEND_OTP_SUCCESS: 'Gửi mã OTP thành công',
  VERIFY_OTP_FORGOT_PASSWORD_SUCCESS: 'Xác thực OTP thành công',
  CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công'
}

export const VOCABULARY_MESSAGE = {
  CREATE_SUCCESS: 'Tạo từ vựng thành công',
  UPDATE_SUCCESS: 'Cập nhật từ vựng thành công',
  DELETE_SUCCESS: 'Xóa từ vựng thành công',
  GET_SUCCESS: 'Lấy thông tin từ vựng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách từ vựng thành công',
  SEARCH_SUCCESS: 'Tìm kiếm từ vựng thành công',
  NOT_FOUND: 'Không tìm thấy từ vựng',
  ALREADY_EXISTS: 'Từ vựng đã tồn tại',
  INVALID_DATA: 'Dữ liệu từ vựng không hợp lệ',
  WORD_JP_REQUIRED: 'Từ tiếng Nhật không được để trống',
  READING_REQUIRED: 'Cách đọc không được để trống',
  WORD_JP_TOO_LONG: 'Từ tiếng Nhật quá dài (tối đa 500 ký tự)',
  READING_TOO_LONG: 'Cách đọc quá dài (tối đa 500 ký tự)',
  IMAGE_URL_INVALID: 'URL hình ảnh không hợp lệ',
  AUDIO_URL_INVALID: 'URL âm thanh không hợp lệ',
  WORD_JP_INVALID_FORMAT:
    'Phải là văn bản tiếng Nhật thuần túy (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)',
  READING_INVALID_FORMAT:
    'Phải là văn bản romaji (chỉ chứa chữ cái Latin, số và dấu câu cơ bản)'
}

export const REWARD_MESSAGE = {
  CREATE_SUCCESS: 'Tạo phần thưởng thành công',
  UPDATE_SUCCESS: 'Cập nhật phần thưởng thành công',
  DELETE_SUCCESS: 'Xóa phần thưởng thành công',
  GET_SUCCESS: 'Lấy thông tin phần thưởng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách phần thưởng thành công',
  NOT_FOUND: 'Không tìm thấy phần thưởng',
  ALREADY_EXISTS: 'Phần thưởng đã tồn tại',
  INVALID_DATA: 'Dữ liệu phần thưởng không hợp lệ',
  NAME_REQUIRED: 'Tên phần thưởng không được để trống'
}

export const SYSTEM_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy bản ghi',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD: 'Mật khẩu mới và mật khẩu xác nhận không khớp',
  INVALID_PASSWORD: 'Sai mật khẩu',
  INVALID_OLD_PASSWORD: 'Mật khẩu cũ không đúng'
}
