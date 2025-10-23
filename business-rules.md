# Business Rules - PokeNihongo Backend System

## 1. Vocabulary Management Rules

### 1.1 Vocabulary Creation Rules

- **Japanese Text Validation**: Từ tiếng Nhật (wordJp) phải chứa CHỈ Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin
- **Reading Format**: Cách đọc (reading) phải là Hiragana thuần túy
- **Length Limits**:
  - wordJp: tối đa 500 ký tự
  - reading: tối đa 500 ký tự
- **Required Fields**: wordJp và reading là bắt buộc
- **Meaning Requirements**: Mỗi từ vựng phải có ít nhất 1 nghĩa (meaning)
- **Translation Requirements**: Mỗi nghĩa phải có ít nhất 1 translation
- **Kanji Linking**: Kanji trong từ vựng phải được liên kết với bảng Kanji
- **Audio Generation**: Audio cho từ vựng được tự động tạo bằng Google TTS nếu không có

### 1.2 Vocabulary Update Rules

- **Duplicate Prevention**: Không cho phép tạo từ vựng trùng lặp
- **Meaning Duplication**: Kiểm tra nghĩa đã tồn tại trước khi tạo mới
- **URL Validation**: imageUrl và audioUrl phải là URL hợp lệ

## 2. Pokemon System Rules

### 2.1 Pokemon Creation Rules

- **Pokedex Number**: Mỗi Pokemon phải có pokedex_number duy nhất
- **Name Requirements**: nameJp là bắt buộc
- **Evolution Chain**: nextPokemonsId phải là array các Pokemon ID hợp lệ
- **Type Assignment**: Pokemon phải có ít nhất 1 type
- **Rarity System**: Rarity phải thuộc COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- **Image Handling**: Tự động upload và xóa image cũ khi update

### 2.2 User Pokemon Management Rules

- **Unique Ownership**: Mỗi user chỉ có thể sở hữu 1 instance của mỗi Pokemon
- **Nickname Uniqueness**: Nickname phải unique trong cùng 1 user
- **First Pokemon**: Pokemon đầu tiên được set làm main Pokemon (isMain = true)
- **Main Pokemon**: Mỗi user chỉ có thể có 1 main Pokemon
- **Level Initialization**: User Pokemon bắt đầu với level đầu tiên trong hệ thống
- **User Level**: User được tự động set level đầu tiên khi tạo Pokemon đầu tiên

### 2.3 Pokemon Evolution Rules

- **Evolution Eligibility**: Pokemon chỉ có thể tiến hóa nếu chưa evolved (isEvolved = false)
- **Valid Evolution**: nextPokemonId phải nằm trong danh sách nextPokemons của Pokemon hiện tại
- **No Duplicate Evolution**: User không được sở hữu Pokemon đã tiến hóa
- **EXP Transfer**: EXP được chuyển hoàn toàn từ Pokemon cũ sang Pokemon mới
- **Level Reset**: Pokemon mới bắt đầu từ level 1 và tự động level up dựa trên EXP được chuyển
- **Old Pokemon**: Pokemon cũ được đánh dấu isEvolved = true và EXP = 0

### 2.4 EXP và Level System Rules

- **EXP Accumulation**: EXP được cộng dồn và không bao giờ bị mất
- **Level Up Logic**: Pokemon level up khi EXP >= requiredExp của level hiện tại
- **Multi-level Up**: Có thể level up nhiều level cùng lúc nếu EXP đủ
- **Max Level Cap**: Pokemon có thể có conditionLevel giới hạn level tối đa
- **Level Calculation**:
  - Nếu đạt max level: giữ nguyên EXP dư thừa
  - Nếu không có level tiếp theo: giữ EXP dư thừa
  - EXP dư thừa không được vượt quá requiredExp của level hiện tại

## 3. User Authentication Rules

### 3.1 Registration Rules

- **Email Validation**: Email phải đúng format và unique
- **Password Requirements**:
  - Tối thiểu 6 ký tự, tối đa 100 ký tự
  - Password và confirmPassword phải khớp nhau
- **Name Requirements**: Name phải từ 2-256 ký tự
- **Phone Number**: Phone number phải từ 9-15 ký tự (optional)
- **Role Assignment**: User mới được assign role "Learner" mặc định
- **Status**: User mới được set status ACTIVE

### 3.2 Login Rules

- **Email Authentication**: Email phải tồn tại trong hệ thống
- **Password Verification**: Password phải khớp với hash trong database
- **Device Verification**: Learner role cần device verification cho device mới
- **Token Generation**: Tạo accessToken và refreshToken sau khi login thành công

### 3.3 Password Management Rules

- **Change Password**: Old password phải đúng để thay đổi password
- **New Password Validation**: New password và confirm password phải khớp
- **Password Hashing**: Tất cả password được hash bằng bcrypt

## 4. Data Validation Rules

### 4.1 Input Validation

- **Zod Schema**: Tất cả input phải được validate với Zod schemas
- **Japanese Text**: Chỉ chấp nhận Hiragana, Katakana và Kanji
- **URL Validation**: URL phải đúng format
- **Email Format**: Email phải tuân theo RFC 5322
- **Phone Format**: Phone number phải là số và đúng độ dài

### 4.2 Business Logic Validation

- **Foreign Key Constraints**: Tất cả foreign keys phải có proper constraints
- **Unique Constraints**: Email, pokedex_number, nickname (per user) phải unique
- **Required Fields**: Các field bắt buộc phải được validate
- **Data Consistency**: Dữ liệu phải consistent giữa các bảng liên quan

## 5. File Management Rules

### 5.1 File Upload Rules

- **Image Files**:
  - Tối đa 5MB
  - Format: JPG, PNG, WebP
  - Upload qua Cloudinary
- **Audio Files**:
  - Tối đa 10MB
  - Format: MP3, WAV
  - Upload qua Cloudinary
- **Automatic Processing**: Tự động compression và optimization

### 5.2 File Deletion Rules

- **Old File Cleanup**: Xóa file cũ khi upload file mới
- **Reference Integrity**: Không xóa file đang được sử dụng
- **Error Handling**: Log warning nhưng không fail operation nếu xóa file thất bại

## 6. System Integration Rules

### 6.1 External Service Integration

- **Google Cloud TTS**: Tự động tạo audio cho từ vựng
- **Google Cloud Speech**: Chuyển đổi speech-to-text
- **Cloudinary**: Lưu trữ và xử lý tất cả files
- **PayOS**: Xử lý thanh toán
- **Resend**: Gửi email notifications

### 6.2 Queue Management Rules

- **Background Jobs**: Sử dụng Bull queue cho các tác vụ nặng
- **Email Queue**: Async email sending
- **File Processing**: Async file upload processing
- **AI Processing**: Async AI operations

## 7. Security Rules

### 7.1 Authentication Rules

- **JWT Tokens**: 24 giờ expiry, refresh tokens 30 ngày
- **Password Hashing**: bcrypt với cost factor 12
- **Rate Limiting**: 100 requests/minute per IP
- **Session Management**: Redis-based session storage

### 7.2 Authorization Rules

- **Role-based Access**: Phân quyền dựa trên role (Admin, Content Creator, Learner)
- **Resource Ownership**: User chỉ có thể access resources của mình
- **API Security**: Tất cả endpoints phải có authentication (trừ public endpoints)

## 8. Error Handling Rules

### 8.1 Error Classification

- **Critical Errors**: Mất dữ liệu, lỗi authentication, payment failure
- **Significant Errors**: API không hoạt động, performance kém nghiêm trọng
- **Minor Errors**: UI/UX issues, typos, minor performance issues

### 8.2 Error Response Rules

- **Consistent Format**: Tất cả errors phải có mã lỗi duy nhất
- **Localization**: Error messages phải được localize theo ngôn ngữ user
- **Sensitive Data**: Không expose sensitive information trong error messages
- **Logging**: Log đầy đủ cho debugging và monitoring

## 9. Performance Rules

### 9.1 Database Rules

- **Connection Pooling**: Sử dụng connection pooling để optimize performance
- **Indexing**: Index cho các queries thường xuyên
- **Query Optimization**: Batch loading và caching cho complex queries
- **Transaction Management**: Sử dụng transactions cho multi-table operations

### 9.2 Caching Rules

- **Redis Caching**: Cache frequently accessed data
- **API Response Caching**: Cache static responses
- **Session Caching**: Redis cho session management
- **Type Effectiveness Caching**: Cache Pokemon type effectiveness calculations

## 10. Data Integrity Rules

### 10.1 Transaction Rules

- **Atomic Operations**: Tất cả operations liên quan phải trong transaction
- **Rollback on Error**: Rollback toàn bộ transaction nếu có lỗi
- **Consistency**: Đảm bảo data consistency sau mỗi transaction

### 10.2 Audit Rules

- **Created/Updated Tracking**: Track người tạo và người update
- **Soft Delete**: Sử dụng soft delete cho user data
- **Audit Logging**: Log tất cả changes quan trọng
- **Data Retention**: Implement data retention policies

---

## Implementation Notes

- Tất cả business rules được implement trong các service classes
- Validation được thực hiện ở multiple layers: DTO validation, Service validation, Database constraints
- Error handling được centralize và consistent across toàn bộ hệ thống
- Performance optimization được áp dụng cho tất cả database operations
- Security rules được enforce ở authentication và authorization levels
