# Danh sách Thông báo Ứng dụng (Application Messages List)

## 5.1 Appendix 1 - Messages List

| Mã      | Type    | Context           | Nội dung (Tiếng Việt)                       |
| ------- | ------- | ----------------- | ------------------------------------------- |
| MSG-001 | Error   | Login             | Tên đăng nhập hoặc mật khẩu không chính xác |
| MSG-002 | Success | Create Vocabulary | Tạo từ vựng mới thành công                  |
| MSG-003 | Info    | Search            | Không tìm thấy kết quả nào phù hợp          |
| MSG-004 | Warning | Delete            | Bạn có chắc chắn muốn xóa mục này không?    |

---

## Hệ thống thông báo PokeNihongo Backend

### 1. Thông báo Xác thực (Auth Messages)

| Mã       | Type    | Context        | Nội dung (Tiếng Việt)                    |
| -------- | ------- | -------------- | ---------------------------------------- |
| AUTH-001 | Success | Login          | Đăng nhập thành công                     |
| AUTH-002 | Success | Register       | Đăng ký thành công                       |
| AUTH-003 | Success | Logout         | Đăng xuất thành công                     |
| AUTH-004 | Success | Reset Password | Đặt lại mật khẩu thành công              |
| AUTH-005 | Success | Update Profile | Cập nhật thông tin cá nhân thành công    |
| AUTH-006 | Error   | Authentication | Mật khẩu không hợp lệ                    |
| AUTH-007 | Error   | Authentication | Mã OTP không hợp lệ hoặc hết hạn         |
| AUTH-008 | Error   | Authentication | Email đã tồn tại                         |
| AUTH-009 | Error   | Authentication | Tài khoản đã bị khóa                     |
| AUTH-010 | Warning | Authentication | Phiên đã hết hạn, vui lòng đăng nhập lại |

### 2. Thông báo Từ vựng (Vocabulary Messages)

| Mã      | Type    | Context           | Nội dung (Tiếng Việt)                                |
| ------- | ------- | ----------------- | ---------------------------------------------------- |
| VOC-001 | Success | Create Vocabulary | Tạo từ vựng thành công                               |
| VOC-002 | Success | Create Vocabulary | Tạo từ vựng mới thành công với nghĩa và translations |
| VOC-003 | Success | Update Vocabulary | Cập nhật từ vựng thành công                          |
| VOC-004 | Success | Delete Vocabulary | Xóa từ vựng thành công                               |
| VOC-005 | Success | Get Info          | Lấy thông tin từ vựng thành công                     |
| VOC-006 | Error   | Vocabulary        | Không tìm thấy từ vựng                               |
| VOC-007 | Error   | Vocabulary        | Từ vựng đã tồn tại                                   |
| VOC-008 | Error   | Validation        | Từ tiếng Nhật không được để trống                    |
| VOC-009 | Error   | Validation        | Cách đọc không được để trống                         |
| VOC-010 | Error   | Validation        | Phải là văn bản tiếng Nhật thuần túy                 |

### 3. Thông báo Pokemon (Pokemon Messages)

| Mã      | Type    | Context        | Nội dung (Tiếng Việt)              |
| ------- | ------- | -------------- | ---------------------------------- |
| POK-001 | Success | Create Pokemon | Tạo Pokemon thành công             |
| POK-002 | Success | Update Pokemon | Cập nhật Pokemon thành công        |
| POK-003 | Success | Delete Pokemon | Xóa Pokemon thành công             |
| POK-004 | Success | Get List       | Lấy danh sách Pokemon thành công   |
| POK-005 | Success | Get Detail     | Lấy thông tin Pokemon thành công   |
| POK-006 | Error   | Pokemon        | Không tìm thấy Pokemon             |
| POK-007 | Error   | Pokemon        | Pokemon đã tồn tại                 |
| POK-008 | Error   | Validation     | Pokedex number không được để trống |
| POK-009 | Error   | Validation     | Tên tiếng Nhật không được để trống |
| POK-010 | Error   | Validation     | Pokemon phải có ít nhất 1 type     |

### 4. Thông báo User Pokemon (User Pokemon Messages)

| Mã      | Type    | Context             | Nội dung (Tiếng Việt)                   |
| ------- | ------- | ------------------- | --------------------------------------- |
| UPK-001 | Success | Create User Pokemon | Tạo User Pokemon thành công             |
| UPK-002 | Success | Update User Pokemon | Cập nhật User Pokemon thành công        |
| UPK-003 | Success | Delete User Pokemon | Xóa User Pokemon thành công             |
| UPK-004 | Success | Evolution           | Tiến hóa Pokemon thành công             |
| UPK-005 | Success | Add EXP             | Thêm EXP cho Pokemon thành công         |
| UPK-006 | Success | Level Up            | Pokemon đã lên cấp!                     |
| UPK-007 | Error   | User Pokemon        | Không tìm thấy User Pokemon             |
| UPK-008 | Error   | User Pokemon        | Nickname đã tồn tại                     |
| UPK-009 | Error   | User Pokemon        | Bạn không có quyền thao tác Pokemon này |
| UPK-010 | Error   | User Pokemon        | Pokemon này không thể tiến hóa thêm nữa |

### 5. Thông báo Hệ thống (System Messages)

| Mã      | Type    | Context | Nội dung (Tiếng Việt)                        |
| ------- | ------- | ------- | -------------------------------------------- |
| SYS-001 | Error   | System  | Không tìm thấy bản ghi                       |
| SYS-002 | Error   | System  | Mật khẩu mới và mật khẩu xác nhận không khớp |
| SYS-003 | Error   | System  | Sai mật khẩu                                 |
| SYS-004 | Error   | System  | Mật khẩu cũ không đúng                       |
| SYS-005 | Warning | System  | Phiên đã hết hạn, vui lòng đăng nhập lại     |
| SYS-006 | Error   | System  | Không có quyền truy cập                      |

### 6. Thông báo Cấp độ (Level Messages)

| Mã      | Type    | Context      | Nội dung (Tiếng Việt)                   |
| ------- | ------- | ------------ | --------------------------------------- |
| LVL-001 | Success | Create Level | Tạo cấp độ thành công                   |
| LVL-002 | Success | Update Level | Cập nhật cấp độ thành công              |
| LVL-003 | Success | Delete Level | Xóa cấp độ thành công                   |
| LVL-004 | Success | Get Info     | Lấy thông tin cấp độ thành công         |
| LVL-005 | Error   | Level        | Không tìm thấy cấp độ                   |
| LVL-006 | Error   | Level        | Cấp độ đã tồn tại                       |
| LVL-007 | Error   | Validation   | Số cấp độ không được để trống           |
| LVL-008 | Error   | Validation   | Số cấp độ phải lớn hơn hoặc bằng 1      |
| LVL-009 | Error   | Validation   | Kinh nghiệm yêu cầu không được để trống |
| LVL-010 | Error   | Validation   | Loại cấp độ không được để trống         |

### 7. Thông báo Người dùng (User Messages)

| Mã      | Type    | Context     | Nội dung (Tiếng Việt)               |
| ------- | ------- | ----------- | ----------------------------------- |
| USR-001 | Success | Create User | Tạo người dùng thành công           |
| USR-002 | Success | Update User | Cập nhật người dùng thành công      |
| USR-003 | Success | Delete User | Xóa người dùng thành công           |
| USR-004 | Success | Get List    | Lấy danh sách người dùng thành công |
| USR-005 | Success | Get Detail  | Lấy thông tin người dùng thành công |
| USR-006 | Error   | User        | Không tìm thấy người dùng           |
| USR-007 | Error   | User        | Email đã tồn tại                    |
| USR-008 | Error   | Validation  | Tên không được để trống             |
| USR-009 | Error   | Validation  | Mật khẩu phải có ít nhất 6 ký tự    |
| USR-010 | Error   | Validation  | Số điện thoại không hợp lệ          |

### 8. Thông báo Chung (Common Messages)

| Mã      | Type    | Context | Nội dung (Tiếng Việt)          |
| ------- | ------- | ------- | ------------------------------ |
| COM-001 | Success | Common  | Thao tác thành công            |
| COM-002 | Error   | Common  | Đã xảy ra lỗi                  |
| COM-003 | Error   | Common  | Dữ liệu không hợp lệ           |
| COM-004 | Error   | Common  | Không có quyền truy cập        |
| COM-005 | Error   | Common  | Truy cập bị cấm                |
| COM-006 | Error   | Common  | Ngôn ngữ không tồn tại để dịch |

### 9. Thông báo Validation (Validation Messages)

| Mã      | Type  | Context    | Nội dung (Tiếng Việt)      |
| ------- | ----- | ---------- | -------------------------- |
| VAL-001 | Error | Validation | Dữ liệu không hợp lệ       |
| VAL-002 | Error | Validation | Trường này là bắt buộc     |
| VAL-003 | Error | Validation | Định dạng không hợp lệ     |
| VAL-004 | Error | Validation | ID người dùng không hợp lệ |

### 10. Thông báo Entity (Entity Messages)

| Mã      | Type  | Context | Nội dung (Tiếng Việt)  |
| ------- | ----- | ------- | ---------------------- |
| ENT-001 | Error | Entity  | Dữ liệu không hợp lệ   |
| ENT-002 | Error | Entity  | Không tìm thấy bản ghi |
| ENT-003 | Error | Entity  | Bản ghi đã tồn tại     |
| ENT-004 | Error | Entity  | ID không hợp lệ        |

---

## Ghi chú

- **Mã**: Mã định danh duy nhất cho mỗi thông báo
- **Type**: Phân loại thông báo (Success, Error, Warning, Info)
- **Context**: Bối cảnh sử dụng thông báo trong ứng dụng
- **Nội dung (Tiếng Việt)**: Nội dung thông báo bằng tiếng Việt

Hệ thống này hỗ trợ đa ngôn ngữ với các file message riêng biệt cho tiếng Việt, tiếng Anh và tiếng Nhật.
