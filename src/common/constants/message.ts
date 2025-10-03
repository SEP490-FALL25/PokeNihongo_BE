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

export const LEVEL_MESSAGE = {
  CREATE_SUCCESS: 'Tạo cấp độ thành công',
  UPDATE_SUCCESS: 'Cập nhật cấp độ thành công',
  DELETE_SUCCESS: 'Xóa cấp độ thành công',
  GET_SUCCESS: 'Lấy thông tin cấp độ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách cấp độ thành công',
  NOT_FOUND: 'Không tìm thấy cấp độ',
  ALREADY_EXISTS: 'Cấp độ đã tồn tại',

  INVALID_DATA: 'Dữ liệu cấp độ không hợp lệ',
  LEVEL_NUMBER_REQUIRED: 'Số cấp độ không được để trống',
  LEVEL_NUMBER_MIN: 'Số cấp độ phải lớn hơn hoặc bằng 1',
  REQUIRED_EXP_REQUIRED: 'Kinh nghiệm yêu cầu không được để trống',
  LEVEL_TYPE_REQUIRED: 'Loại cấp độ không được để trống',
  NEXT_LEVEL_ID_REQUIRED: 'ID cấp độ tiếp theo không được để trống',
  REWARD_ID_REQUIRED: 'ID phần thưởng không được để trống',
  CONFLICT_TYPE_NEXT_LEVEL:
    'Cấp độ tiếp theo không hợp lệ (phải cùng loại và số cấp độ phải là số liền kề)'
}

export const LANGUAGES_MESSAGE = {
  CREATE_SUCCESS: 'Tạo ngôn ngữ thành công',
  UPDATE_SUCCESS: 'Cập nhật ngôn ngữ thành công',
  DELETE_SUCCESS: 'Xóa ngôn ngữ thành công',
  GET_SUCCESS: 'Lấy thông tin ngôn ngữ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách ngôn ngữ thành công',
  NOT_FOUND: 'Không tìm thấy ngôn ngữ',
  ALREADY_EXISTS: 'Ngôn ngữ đã tồn tại',
  INVALID_DATA: 'Dữ liệu ngôn ngữ không hợp lệ',
  CODE_REQUIRED: 'Mã ngôn ngữ không được để trống',
  NAME_REQUIRED: 'Tên ngôn ngữ không được để trống',
  CODE_TOO_LONG: 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)',
  NAME_TOO_LONG: 'Tên ngôn ngữ quá dài (tối đa 100 ký tự)',
  CODE_TOO_SHORT: 'Mã ngôn ngữ quá ngắn (tối thiểu 2 ký tự)',
  LANGUAGE_NOT_SUPPORTED: 'Ngôn ngữ không được hỗ trợ'
}

export const KANJI_MESSAGE = {
  CREATE_SUCCESS: 'Tạo kanji thành công',
  CREATE_WITH_READINGS_SUCCESS: 'Tạo Kanji cùng với cách đọc thành công',
  UPDATE_SUCCESS: 'Cập nhật kanji thành công',
  DELETE_SUCCESS: 'Xóa kanji thành công',
  GET_SUCCESS: 'Lấy thông tin kanji thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách kanji thành công',
  NOT_FOUND: 'Không tìm thấy kanji',
  ALREADY_EXISTS: 'Kanji đã tồn tại',
  INVALID_DATA: 'Dữ liệu kanji không hợp lệ',
  CHARACTER_REQUIRED: 'Ký tự kanji không được để trống',
  MEANING_KEY_REQUIRED: 'Key nghĩa không được để trống',
  CHARACTER_INVALID: 'Phải là một ký tự Kanji duy nhất',
  STROKE_COUNT_INVALID: 'Số nét vẽ phải lớn hơn 0 và nhỏ hơn 50',
  JLPT_LEVEL_INVALID: 'Cấp độ JLPT không hợp lệ'
}

export const KANJI_READING_MESSAGE = {
  CREATE_SUCCESS: 'Tạo cách đọc kanji thành công',
  UPDATE_SUCCESS: 'Cập nhật cách đọc kanji thành công',
  DELETE_SUCCESS: 'Xóa cách đọc kanji thành công',
  GET_SUCCESS: 'Lấy thông tin cách đọc kanji thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách cách đọc kanji thành công',
  NOT_FOUND: 'Không tìm thấy cách đọc kanji',
  ALREADY_EXISTS: 'Cách đọc kanji đã tồn tại',
  INVALID_DATA: 'Dữ liệu cách đọc kanji không hợp lệ',
  KANJI_ID_REQUIRED: 'Kanji ID không được để trống',
  READING_TYPE_REQUIRED: 'Loại cách đọc không được để trống',
  READING_REQUIRED: 'Cách đọc không được để trống',
  READING_TYPE_INVALID: 'Loại cách đọc phải là onyomi, kunyomi, nanori, hoặc irregular'
}

export const MEANING_MESSAGE = {
  CREATE_SUCCESS: 'Tạo nghĩa thành công',
  UPDATE_SUCCESS: 'Cập nhật nghĩa thành công',
  DELETE_SUCCESS: 'Xóa nghĩa thành công',
  GET_SUCCESS: 'Lấy thông tin nghĩa thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách nghĩa thành công',
  NOT_FOUND: 'Không tìm thấy nghĩa',
  ALREADY_EXISTS: 'Nghĩa đã tồn tại',
  INVALID_DATA: 'Dữ liệu nghĩa không hợp lệ',
  VOCABULARY_ID_REQUIRED: 'Vocabulary ID không được để trống',
  EXAMPLE_SENTENCE_TOO_LONG: 'Câu ví dụ quá dài (tối đa 1000 ký tự)',
  JAPANESE_TEXT_INVALID: 'Phải là văn bản tiếng Nhật hợp lệ'
}

export const TRANSLATION_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bản dịch thành công',
  UPDATE_SUCCESS: 'Cập nhật bản dịch thành công',
  DELETE_SUCCESS: 'Xóa bản dịch thành công',
  GET_SUCCESS: 'Lấy thông tin bản dịch thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bản dịch thành công',
  NOT_FOUND: 'Không tìm thấy bản dịch',
  ALREADY_EXISTS: 'Bản dịch đã tồn tại',
  INVALID_DATA: 'Dữ liệu bản dịch không hợp lệ',
  LANGUAGE_CODE_REQUIRED: 'Mã ngôn ngữ không được để trống',
  KEY_REQUIRED: 'Key dịch không được để trống',
  VALUE_REQUIRED: 'Nội dung dịch không được để trống',
  LANGUAGE_CODE_INVALID: 'Mã ngôn ngữ không hợp lệ',
  KEY_INVALID: 'Key dịch không đúng định dạng',
  VALUE_TOO_LONG: 'Nội dung dịch quá dài (tối đa 2000 ký tự)',
  BULK_CREATE_SUCCESS: 'Tạo nhiều bản dịch thành công'
}

export const WORDTYPE_MESSAGE = {
  CREATE_SUCCESS: 'Tạo loại từ thành công',
  UPDATE_SUCCESS: 'Cập nhật loại từ thành công',
  DELETE_SUCCESS: 'Xóa loại từ thành công',
  GET_SUCCESS: 'Lấy thông tin loại từ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách loại từ thành công',
  NOT_FOUND: 'Không tìm thấy loại từ',
  ALREADY_EXISTS: 'Loại từ đã tồn tại',
  INVALID_DATA: 'Dữ liệu loại từ không hợp lệ',
  TAG_REQUIRED: 'Tag không được để trống',
  TAG_TOO_LONG: 'Tag quá dài (tối đa 50 ký tự)',
  NAME_KEY_INVALID: 'Name key không đúng định dạng'
}