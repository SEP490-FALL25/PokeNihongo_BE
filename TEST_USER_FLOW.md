# Luồng làm test của User

## Tổng quan

Hệ thống test được thiết kế để quản lý việc user làm bài test một cách chặt chẽ, với cơ chế giới hạn số lần làm bài (limit) và theo dõi từng lần thử (attempt) của user.

## Các Model liên quan

### 1. **Test**

- Model chính chứa thông tin bài test
- `limit`: Số lần tối đa user có thể làm bài test này (null = không giới hạn, 0 = không cho phép)
- `testType`: Loại test (VOCABULARY, GRAMMAR, KANJI, READING, LISTENING, SPEAKING, PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, GENERAL)
- `status`: Trạng thái test (ACTIVE, INACTIVE)

### 2. **UserTest**

- Model thể hiện sở hữu test của user
- `userId`: ID của user
- `testId`: ID của test
- `status`: Trạng thái của UserTest
  - `NOT_STARTED`: Chưa bắt đầu (khi hết limit hoặc chưa kích hoạt)
  - `ACTIVE`: Đã kích hoạt, có thể làm bài
- `limit`: Số lần còn lại của user (được copy từ `Test.limit` khi khởi tạo)

### 3. **UserTestAttempt**

- Model lưu lại mỗi lần user làm test
- `userId`: ID của user
- `testId`: ID của test
- `status`: Trạng thái của attempt
  - `NOT_STARTED`: Chưa bắt đầu
  - `IN_PROGRESS`: Đang làm
  - `COMPLETED`: Hoàn thành (>= 60% đúng)
  - `FAIL`: Thất bại (< 60% đúng)
  - `SKIPPED`: Đã bỏ qua
  - `ABANDONED`: Đã bỏ dở
- `time`: Thời gian làm bài (giây)
- `score`: Điểm số (%)

### 4. **UserTestAnswerLog**

- Model lưu lại từng câu trả lời của user trong mỗi attempt
- `userTestAttemptId`: ID của attempt
- `questionBankId`: ID của câu hỏi
- `answerId`: ID của đáp án user chọn
- `isCorrect`: Đáp án đúng hay sai

## Luồng hoạt động

### Bước 1: Khởi tạo UserTest cho user mới

Khi user đăng ký tài khoản, hệ thống tự động tạo `UserTest` cho tất cả các test có `status = ACTIVE` (trừ `MATCH_TEST`):

```typescript
// File: src/modules/auth/auth.service.ts (hoặc google.service.ts)
await this.userTestService.initUserTests(user.id)
```

**Logic khởi tạo:**

- Lấy tất cả test có `status = ACTIVE` và `testType != MATCH_TEST`
- Với mỗi test:
  - Nếu `testType = SUBSCRIPTION_TEST` → tạo `UserTest` với `status = NOT_STARTED`
  - Nếu `testType` khác → tạo `UserTest` với `status = ACTIVE`
  - Copy `limit` từ `Test.limit` sang `UserTest.limit`

### Bước 2: User bắt đầu làm test

Khi user gọi API `GET /user-test-attempt/:id` (trong đó `:id` là ID của test):

**File:** `src/modules/user-test-attempt/user-test-attempt.service.ts`

```typescript
async getTestAttemptByTestId(id: number, userId: number, languageCode: string)
```

**Các bước xử lý:**

1. **Kiểm tra UserTest tồn tại:**

   - Lấy `UserTest` theo `userId` và `testId`
   - Nếu không tồn tại → throw error với i18n message `USER_TEST_NOT_FOUND`

2. **Kiểm tra limit:**

   - Nếu `UserTest.limit !== null && limit <= 0` → throw error với i18n message `OUT_OF_LIMIT`
   - Nếu `UserTest.limit = null` hoặc `limit = 0` → không giới hạn, cho phép làm

3. **Giảm limit:**

   - Gọi `userTestRepository.decrementLimit(userId, testId)`
   - Nếu `limit > 0` → giảm đi 1
   - Nếu `limit` giảm xuống còn 0 → chuyển `status` của `UserTest` thành `NOT_STARTED`

4. **Tạo attempt mới:**

   - Gọi `create(userId, testId)` để tạo `UserTestAttempt` mới
   - Set `status = NOT_STARTED`
   - Mỗi lần vào làm test sẽ tạo attempt mới hoàn toàn (không có logic IN_PROGRESS/ABANDONED nữa)

5. **Lấy thông tin test:**

   - Lấy chi tiết test với tất cả test sets
   - Lấy tất cả câu hỏi và đáp án trong mỗi test set
   - Áp dụng i18n cho question và answer

6. **Trả về dữ liệu:**
   - Thông tin test (id, name, description, testType)
   - Danh sách test sets với questions và answers
   - `userTestAttemptId`: ID của attempt vừa tạo
   - `totalQuestions`: Tổng số câu hỏi
   - `answeredQuestions`: Số câu đã trả lời (0 vì mới tạo)
   - `time`: Thời gian (0 vì chưa làm)

### Bước 3: User trả lời câu hỏi

User gọi API để lưu từng câu trả lời:

**File:** `src/modules/user-test-answer-log/user-test-answer-log.service.ts`

```typescript
async createOrUpdate(body: CreateOrUpdateUserTestAnswerLogBodyType, userId: number)
```

**Logic:**

- Lưu hoặc cập nhật `UserTestAnswerLog`
- Validate `userTestAttemptId` thuộc về user
- Validate `questionBankId` và `answerId` tồn tại
- Validate `answerId` thuộc về `questionBankId`
- Set `isCorrect` dựa trên `answer.isCorrect`

### Bước 4: User nộp bài

User gọi API để nộp bài:

**File:** `src/modules/user-test-attempt/user-test-attempt.service.ts`

```typescript
async submitTestCompletion(userTestAttemptId: number, userId: number)
```

**Logic:**

1. Validate attempt tồn tại và thuộc về user
2. Validate attempt chưa được submit (status không phải COMPLETED, FAIL, SKIPPED, ABANDONED)
3. Lấy tất cả answer logs của attempt
4. Tính điểm:
   - Đếm số câu trả lời đúng
   - Tính phần trăm: `(số câu đúng / tổng số câu) * 100`
5. Cập nhật attempt:
   - `status = COMPLETED` nếu score >= 60%
   - `status = FAIL` nếu score < 60%
   - Set `score`
   - Set `time` (từ bắt đầu đến khi submit)

### Bước 5: Xem kết quả chi tiết

User gọi API để xem review:

**File:** `src/modules/user-test-attempt/user-test-attempt.service.ts`

```typescript
async getTestAttemptReview(id: number, userId: number, languageCode: string)
```

**Logic:**

1. Validate attempt tồn tại và thuộc về user
2. Validate attempt đã hoàn thành (status = COMPLETED hoặc FAIL)
3. Tính tỷ lệ đúng:
   - Nếu < 80% → return error với i18n message `REVIEW_INSUFFICIENT_SCORE`
   - Nếu >= 80% → cho phép xem review
4. Build review data:
   - Với mỗi question:
     - Mark đáp án đúng (`type = 'correct_answer'`)
     - Mark đáp án user chọn sai (`type = 'user_selected_incorrect'`)
     - Thêm `explanation` cho từng đáp án
5. Trả về:
   - Thông tin test
   - Danh sách test sets với review
   - `totalQuestions`, `answeredCorrect`, `answeredInCorrect`
   - `time`, `score`, `status`

## Đặc điểm quan trọng

### 1. **Mỗi lần vào làm = 1 attempt mới**

- Không có logic tiếp tục attempt cũ (IN_PROGRESS/ABANDONED)
- Không có cơ chế "save draft"
- User phải hoàn thành trong 1 lần

### 2. **Limit được trừ ngay khi vào làm**

- Limit được trừ trước khi user thực sự làm bài
- Nếu user vào rồi thoát ra, limit vẫn bị trừ
- Điều này đảm bảo mỗi lần vào làm đều được tính là 1 lượt

### 3. **Status của UserTest**

- `ACTIVE`: User có thể làm bài
- `NOT_STARTED`: User không thể làm bài (chưa được kích hoạt hoặc đã hết limit)

### 4. **Auto-update limit từ Test**

Cron job chạy mỗi ngày lúc 00:00 (giờ HCM) để đồng bộ limit:

```typescript
// File: src/modules/user-test/user-test.service.ts
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Ho_Chi_Minh'
})
async runAutoTest()
```

**Logic:**

- Lấy tất cả test có `status = ACTIVE` và `testType != MATCH_TEST` và `testType != PLACEMENT_TEST_DONE`
- Cập nhật `UserTest.limit` = `Test.limit` cho tất cả user

### 5. **Init UserTest cho tất cả user**

API `POST /user-test/init-all` để khởi tạo UserTest cho tất cả user hiện có:

```typescript
// File: src/modules/user-test/user-test.service.ts
async initAllUsersTests()
```

**Logic:**

- Lấy tất cả user không bị soft delete
- Với mỗi user, gọi `initUserTests(userId)`
- Sử dụng `bulkUpsert` để tránh duplicate

## API Endpoints

### User

1. **GET /user-test/my**

   - Lấy danh sách UserTest của user hiện tại
   - Filter: `status`, `testType`
   - Trả về full thông tin Test (không có `createdAt`, `updatedAt`, `creatorId`, `creator`)
   - Áp dụng i18n cho test name và description

2. **GET /user-test-attempt/:id**

   - Lấy thông tin test để bắt đầu làm
   - Validate và trừ limit
   - Tạo attempt mới
   - Trả về questions và answers với i18n

3. **POST /user-test-answer-log**

   - Lưu hoặc cập nhật câu trả lời của user

4. **POST /user-test-attempt/:id/submit**

   - Nộp bài
   - Tính điểm
   - Cập nhật status và score

5. **GET /user-test-attempt/:id/review**
   - Xem review chi tiết
   - Yêu cầu >= 80% đúng

### Admin

1. **POST /user-test/init-all**

   - Khởi tạo UserTest cho tất cả user

2. **POST /user-test/auto-update-limit**

   - Trigger auto-update limit thủ công (thay vì chờ cron job)

3. **POST /test/auto-add-free-testsets**

   - Tự động thêm test sets free (price = 0, ACTIVE, VOCABULARY/GRAMMAR/KANJI) vào test PLACEMENT_TEST_DONE

4. **GET /test/:id/placement-questions**

   - Lấy 10 câu hỏi random cho placement test (3 N5, 4 N4, 3 N3)

5. **GET /test/:id/random-questions**
   - Lấy N câu hỏi random theo level

## Validation Rules

1. **Test type vs TestSet type:**

   - TestSet có `testType = GENERAL` → cho phép mọi questionType
   - TestSet có `testType` khác → questionType phải khớp

2. **Level compatibility:**

   - Nếu TestSet `testType = GENERAL` → QuestionBank `levelN <= TestSet.levelN`
   - Nếu TestSet `testType != GENERAL` → QuestionBank `levelN = TestSet.levelN`

3. **PLACEMENT_TEST_DONE constraint:**

   - Chỉ được phép có 1 test với `testType = PLACEMENT_TEST_DONE` trong toàn hệ thống
   - Validate khi tạo test mới

4. **LevelN của TestSet:**
   - Không thể đổi `levelN` của TestSet nếu đã có câu hỏi (trừ khi `testType = GENERAL` hoặc `levelN = 0`)

## I18n Messages

### UserTestAttempt

- `REVIEW_NOT_COMPLETED`: "Bài test chưa hoàn thành" / "Test not completed yet"
- `REVIEW_INSUFFICIENT_SCORE`: "Bạn cần đạt ít nhất 80% số câu trả lời đúng để xem đáp án" / "You need to score at least 80% correct to view the answer review"
- `REVIEW_SUCCESS`: "Lấy thông tin đáp án bài test thành công" / "Test review retrieved successfully"
- `OUT_OF_LIMIT`: "Bạn đã hết lượt làm bài test này" / "You have run out of attempts for this test"
- `USER_TEST_NOT_FOUND`: "Không tìm thấy UserTest" / "UserTest not found"

## Database Schema

```prisma
model Test {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  price       Decimal? @default(0)
  levelN      Int?     @default(0) // 0-5, 0 = multiple levels
  testType    TestStatus
  status      TestSetStatus @default(ACTIVE)
  limit       Int?     @default(0) // null = unlimited
  creatorId   Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  testSets    TestTestSet[]
  userTests   UserTest[]
  // ...
}

model UserTest {
  id        Int            @id @default(autoincrement())
  userId    Int
  testId    Int
  status    UserTestStatus @default(NOT_STARTED)
  limit     Int?           @default(0)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  user      User           @relation("UserTests")
  test      Test           @relation("TestUserTests")

  @@unique([userId, testId])
  @@index([userId])
  @@index([testId])
}

model UserTestAttempt {
  id         Int                   @id @default(autoincrement())
  userId     Int
  testId     Int
  time       Int?                  @default(0)
  score      Decimal?              @default(0)
  status     TestAttemptStatus     @default(NOT_STARTED)
  createdAt  DateTime              @default(now())
  updatedAt  DateTime              @updatedAt

  user       User                  @relation("UserTestAttempts")
  test       Test                  @relation("TestUserTestAttempts")
  answerLogs UserTestAnswerLog[]

  @@index([userId])
  @@index([testId])
  @@index([status])
}

model UserTestAnswerLog {
  id                    Int                 @id @default(autoincrement())
  userTestAttemptId     Int
  questionBankId        Int
  answerId              Int
  isCorrect             Boolean             @default(false)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  userTestAttempt       UserTestAttempt     @relation("UserTestAttemptAnswerLogs")
  questionBank          QuestionBank        @relation("QuestionBankUserTestAnswerLogs")
  answer                Answer              @relation("AnswerUserTestAnswerLogs")

  @@index([userTestAttemptId])
  @@index([questionBankId])
  @@index([answerId])
}
```

## Ví dụ luồng hoàn chỉnh

### Ví dụ 1: User làm test có limit = 3

1. **Lúc đầu:**

   - User mới đăng ký
   - System tạo `UserTest`: `status = ACTIVE`, `limit = 3`

2. **Lần 1 làm test:**

   - User gọi `GET /user-test-attempt/:id`
   - System giảm limit: `limit = 2`
   - Tạo attempt mới: `id = 1`, `status = NOT_STARTED`
   - User làm bài và nộp
   - System tính điểm: 70%
   - System update attempt: `status = COMPLETED`, `score = 70`

3. **Lần 2 làm test:**

   - User gọi `GET /user-test-attempt/:id`
   - System giảm limit: `limit = 1`
   - Tạo attempt mới: `id = 2`, `status = NOT_STARTED`
   - User làm bài và nộp
   - System tính điểm: 45%
   - System update attempt: `status = FAIL`, `score = 45`

4. **Lần 3 làm test:**

   - User gọi `GET /user-test-attempt/:id`
   - System giảm limit: `limit = 0`
   - System chuyển `UserTest.status = NOT_STARTED`
   - Tạo attempt mới: `id = 3`, `status = NOT_STARTED`
   - User làm bài và nộp
   - System tính điểm: 85%
   - System update attempt: `status = COMPLETED`, `score = 85`

5. **Lần 4 cố làm:**
   - User gọi `GET /user-test-attempt/:id`
   - System check: `limit = 0`
   - System throw error: `OUT_OF_LIMIT`

### Ví dụ 2: User làm test không giới hạn (limit = null)

1. **Lúc đầu:**

   - `UserTest`: `status = ACTIVE`, `limit = null`

2. **Mỗi lần làm:**

   - System check: `limit = null` → không giảm
   - Tạo attempt mới
   - User làm bài và nộp

3. **Có thể làm vô tận**

## Tóm tắt

1. **UserTest** quản lý quyền truy cập và limit của user với test
2. **UserTestAttempt** lưu từng lần user làm bài
3. **UserTestAnswerLog** lưu chi tiết từng câu trả lời
4. Limit được trừ ngay khi user vào làm (không phải khi nộp)
5. Mỗi lần vào làm tạo attempt mới hoàn toàn
6. Cần >= 80% đúng mới được xem review
7. Auto-update limit mỗi ngày thông qua cron job
