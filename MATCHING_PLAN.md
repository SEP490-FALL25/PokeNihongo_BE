# Plan: Matching System & Test Answer Logging

## Tóm tắt thiết kế

### Cấu trúc lưu trữ câu hỏi và câu trả lời trong Matching:

```
Matching (1 trận đấu)
  ├── MatchingTurn (6 records: 3 turns × 2 players)
  │     ├── player1 turn 1 (userId = player1Id, turnNumber = 1)
  │     ├── player2 turn 1 (userId = player2Id, turnNumber = 1)
  │     ├── player1 turn 2 (userId = player1Id, turnNumber = 2)
  │     ├── player2 turn 2 (userId = player2Id, turnNumber = 2)
  │     ├── player1 turn 3 (userId = player1Id, turnNumber = 3)
  │     └── player2 turn 3 (userId = player2Id, turnNumber = 3)
  │
  └── MatchingTurnQuestion (30 records: 3 turns × 10 questions)
        ├── Turn 1: 10 câu hỏi (matchId, turnNumber=1, questionOrder=1-10)
        ├── Turn 2: 10 câu hỏi (matchId, turnNumber=2, questionOrder=1-10)
        └── Turn 3: 10 câu hỏi (matchId, turnNumber=3, questionOrder=1-10)
              │
              └── MatchingUserAnswer (60 records: 30 questions × 2 players)
                    ├── Player1 answers cho 30 câu hỏi
                    └── Player2 answers cho 30 câu hỏi
```

**Điểm quan trọng:**

- `MatchingTurnQuestion`: Link trực tiếp với `Matching` (matchId + turnNumber), không link với `MatchingTurn`
- Đảm bảo cả 2 players làm cùng 10 câu hỏi trong mỗi turn
- `MatchingUserAnswer`: Lưu câu trả lời của mỗi user cho mỗi câu hỏi

## 1. Database Schema Design

### 1.1. Models cho Test (tương tự Exercise)

```prisma
// Enum cho trạng thái làm Test
enum TestAttemptStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  FAIL
  ABANDONED
  SKIPPED
}

// Model UserTestAttempt (Lần thử Test của user)
model UserTestAttempt {
  id         Int               @id @default(autoincrement())
  userId     Int
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  testId     Int
  test       Test              @relation(fields: [testId], references: [id], onDelete: Cascade)
  time       Int?              @default(0) // Thời gian làm bài (giây)
  status     TestAttemptStatus @default(IN_PROGRESS)
  score      Int?              @default(0) // Điểm số
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  // Quan hệ với UserTestAnswerLog
  userTestAnswerLogs UserTestAnswerLog[]

  @@index([userId])
  @@index([testId])
  @@index([status])
}

// Model UserTestAnswerLog (Log câu trả lời của user trong Test)
model UserTestAnswerLog {
  id                 Int               @id @default(autoincrement())
  isCorrect          Boolean           @default(false)
  userTestAttemptId  Int
  userTestAttempt    UserTestAttempt   @relation(fields: [userTestAttemptId], references: [id], onDelete: Cascade)
  questionBankId     Int
  questionBank       QuestionBank      @relation(fields: [questionBankId], references: [id], onDelete: Cascade)
  answerId           Int
  answer             Answer            @relation(fields: [answerId], references: [id], onDelete: Cascade)
  turnNumber         Int?              // Số thứ tự turn (nếu là matching)
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  @@index([userTestAttemptId])
  @@index([questionBankId])
  @@index([answerId])
  @@index([turnNumber])
}
```

### 1.2. Models cho Matching System

```prisma
// Enum cho trạng thái Match
enum MatchStatus {
  WAITING        // Đang chờ đối thủ
  IN_PROGRESS    // Đang diễn ra
  COMPLETED      // Đã hoàn thành
  ABANDONED      // Bị hủy
  TIMEOUT        // Hết thời gian
}

// Enum cho kết quả Match
enum MatchResult {
  WIN
  LOSE
  DRAW
  PENDING
}

// Model Match (Trận đấu)
model Match {
  id              Int           @id @default(autoincrement())
  player1Id       Int           // User 1
  player1         User          @relation("MatchPlayer1", fields: [player1Id], references: [id], onDelete: Cascade)
  player2Id       Int?          // User 2 (null nếu chưa match)
  player2         User?         @relation("MatchPlayer2", fields: [player2Id], references: [id], onDelete: SetNull)
  testId          Int?          // Test được sử dụng (nếu match theo Test)
  test            Test?         @relation(fields: [testId], references: [id], onDelete: SetNull)
  testSetId       Int?          // TestSet được sử dụng (nếu match theo TestSet)
  testSet         TestSet?      @relation(fields: [testSetId], references: [id], onDelete: SetNull)
  status          MatchStatus   @default(WAITING)
  player1Score    Int           @default(0)
  player2Score    Int           @default(0)
  player1Result   MatchResult   @default(PENDING)
  player2Result   MatchResult   @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Quan hệ với MatchTurn
  matchTurns      MatchTurn[]

  @@index([player1Id])
  @@index([player2Id])
  @@index([status])
  @@index([testId])
  @@index([testSetId])
}

// Model Matching (Trận đấu) - Dựa trên ERD
model Matching {
  id          Int           @id @default(autoincrement())
  player1Id   Int           // User 1
  player1     User          @relation("MatchPlayer1", fields: [player1Id], references: [id], onDelete: Cascade)
  player2Id   Int?          // User 2 (null nếu chưa match)
  player2     User?         @relation("MatchPlayer2", fields: [player2Id], references: [id], onDelete: SetNull)
  durationSec Int?          // Thời gian trận đấu (giây)
  status      MatchStatus   @default(WAITING)
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Quan hệ với MatchingTurn
  matchingTurns MatchingTurn[]

  // Quan hệ với MatchingTurnQuestion (câu hỏi của các turns)
  turnQuestions MatchingTurnQuestion[]

  @@index([player1Id])
  @@index([player2Id])
  @@index([status])
}

// Model MatchingTurn (Turn trong trận đấu) - Dựa trên ERD
// Mỗi turn có 2 records: 1 cho player1, 1 cho player2
model MatchingTurn {
  id                Int           @id @default(autoincrement())
  matchId           Int
  match             Matching      @relation(fields: [matchId], references: [id], onDelete: Cascade)
  turnNumber        Int           // 1, 2, 3
  userId            Int           // User của turn này (player1 hoặc player2)
  user              User          @relation("MatchTurnUser", fields: [userId], references: [id], onDelete: Cascade)
  userPokemonId     Int?          // Pokémon user sử dụng trong turn này
  userPokemon       UserPokemon?  @relation(fields: [userPokemonId], references: [id], onDelete: SetNull)
  userIdWinner      Int?          // User thắng turn này (nếu có)
  userWinner        User?         @relation("MatchTurnWinner", fields: [userIdWinner], references: [id], onDelete: SetNull)
  score             Int           @default(0) // Điểm của user trong turn này
  durationCompleted Int?          // Thời gian hoàn thành turn (giây)
  testSetId         Int?          // TestSet cho turn này
  testSet           TestSet?      @relation(fields: [testSetId], references: [id], onDelete: SetNull)
  testId            Int?          // Test cho turn này
  test              Test?         @relation(fields: [testId], references: [id], onDelete: SetNull)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@unique([matchId, turnNumber, userId]) // Mỗi user chỉ có 1 record cho mỗi turn
  @@index([matchId])
  @@index([turnNumber])
  @@index([userId])
  @@index([testSetId])
  @@index([testId])
}

// Model MatchingTurnQuestion (Câu hỏi được chọn cho turn)
// Lưu 10 câu hỏi được chọn từ TestSet cho turn này (dùng chung cho cả 2 players)
// Link trực tiếp với Matching (matchId + turnNumber) thay vì MatchingTurn để tránh duplicate
model MatchingTurnQuestion {
  id                Int               @id @default(autoincrement())
  matchId           Int               // Link đến Matching
  match             Matching          @relation(fields: [matchId], references: [id], onDelete: Cascade)
  turnNumber        Int               // Số turn (1, 2, 3)
  questionBankId    Int               // Câu hỏi được chọn
  questionBank      QuestionBank      @relation(fields: [questionBankId], references: [id], onDelete: Cascade)
  questionOrder     Int                @default(0) // Thứ tự câu hỏi trong turn (1-10)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Quan hệ với MatchingUserAnswer (câu trả lời của users)
  userAnswers       MatchingUserAnswer[]

  @@unique([matchId, turnNumber, questionBankId]) // Mỗi câu hỏi chỉ xuất hiện 1 lần trong turn
  @@index([matchId])
  @@index([turnNumber])
  @@index([questionBankId])
  @@index([questionOrder])
}

// Model MatchingUserAnswer (Câu trả lời của user cho câu hỏi trong turn)
model MatchingUserAnswer {
  id                     Int                    @id @default(autoincrement())
  matchingTurnQuestionId Int                    // Câu hỏi trong turn
  matchingTurnQuestion   MatchingTurnQuestion   @relation(fields: [matchingTurnQuestionId], references: [id], onDelete: Cascade)
  userId                 Int                    // User trả lời
  user                   User                   @relation("MatchUserAnswer", fields: [userId], references: [id], onDelete: Cascade)
  selectedAnswerId       Int?                   // Đáp án user chọn (null nếu chưa trả lời)
  selectedAnswer         Answer?                @relation(fields: [selectedAnswerId], references: [id], onDelete: SetNull)
  isCorrect              Boolean?               // Có đúng không (tính từ Answer.isCorrect)
  answeredAt             DateTime?              // Thời điểm trả lời
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt

  @@unique([matchingTurnQuestionId, userId]) // Mỗi user chỉ trả lời 1 lần cho mỗi câu hỏi
  @@index([matchingTurnQuestionId])
  @@index([userId])
  @@index([selectedAnswerId])
}
```

## 2. Flow & Logic

### 2.1. Test Flow (giống Exercise hiện tại)

```
User chọn Test
  ↓
Tạo UserTestAttempt (status: NOT_STARTED)
  ↓
Update status: IN_PROGRESS khi bắt đầu
  ↓
User trả lời từng câu → Tạo/Update UserTestAnswerLog
  ↓
Submit → Tính điểm → Update status: COMPLETED/FAIL
```

### 2.2. Matching Flow (Chi tiết với Question Logging)

```
User 1 tạo Matching (status: WAITING)
  ↓
System match với User 2 (hoặc AI)
  ↓
Update status: IN_PROGRESS, startedAt = now()
  ↓
Tạo 3 MatchingTurn (turnNumber: 1, 2, 3)
  - Mỗi turn tạo 2 records: 1 cho player1, 1 cho player2
  ↓
Với mỗi Turn:
  1. Chọn TestSet/Test cho turn
  2. Random chọn 10 câu hỏi từ TestSet
  3. Tạo MatchingTurnQuestion (10 records) với:
     * matchId: ID của Matching
     * turnNumber: Số turn (1, 2, hoặc 3)
     * questionBankId: ID câu hỏi được chọn
     * questionOrder: Thứ tự (1-10)
     → Lưu câu hỏi được chọn (dùng chung cho cả 2 players)
  4. Tạo 2 MatchingTurn records:
     * 1 cho player1 (userId = player1Id)
     * 1 cho player2 (userId = player2Id)
  5. Cả 2 players làm cùng 10 câu này
  6. Khi user trả lời:
     - Tìm MatchingTurnQuestion theo matchId + turnNumber + questionBankId
     - Tạo/Update MatchingUserAnswer với:
       * matchingTurnQuestionId: ID câu hỏi trong turn
       * userId: ID user trả lời
       * selectedAnswerId: ID đáp án chọn
       * isCorrect: Tự động tính từ Answer.isCorrect
       * answeredAt: Thời điểm trả lời
  7. Sau khi cả 2 players hoàn thành:
     - Đếm số câu đúng của mỗi user từ MatchingUserAnswer.isCorrect
     - Update MatchingTurn.score cho cả 2 players
     - Xác định userIdWinner của turn (user có score cao hơn)
  ↓
Sau 3 turns:
  - Tính tổng điểm từ MatchingTurn.score
  - Update Matching.player1Score, player2Score
  - Xác định WIN/LOSE/DRAW
  - Update status: COMPLETED, endedAt = now()
```

## 3. Answer Logging Strategy

### 3.1. Test Answer Logging

**Structure:**

- `UserTestAttempt`: Một lần làm Test
- `UserTestAnswerLog`: Log từng câu trả lời trong Test

**Fields quan trọng:**

- `turnNumber`: NULL (không có turn)
- `isCorrect`: Tự động tính từ Answer.isCorrect
- `answerId`: ID của answer user chọn

### 3.2. Matching Answer Logging (Chi tiết)

**Structure:**

- `Matching`: Trận đấu tổng thể
- `MatchingTurn`: Từng turn của mỗi user (mỗi turn có 2 records: player1 và player2)
- `MatchingTurnQuestion`: 10 câu hỏi được chọn cho turn (dùng chung cho cả 2 players)
- `MatchingUserAnswer`: Câu trả lời của mỗi user cho mỗi câu hỏi

**Flow chi tiết:**

1. **Khi bắt đầu turn:**

   - Chọn TestSet cho turn
   - Random chọn 10 câu hỏi từ TestSet
   - Tạo 10 `MatchingTurnQuestion` records với:
     - `matchId`: ID của Matching
     - `turnNumber`: Số turn (1, 2, hoặc 3)
     - `questionBankId`: ID câu hỏi được chọn
     - `questionOrder`: Thứ tự câu hỏi (1-10)
   - Tạo 2 `MatchingTurn` records (1 cho player1, 1 cho player2)

2. **Khi user trả lời câu hỏi:**

   - Tìm `MatchingTurnQuestion` theo `matchId` + `turnNumber` + `questionBankId`
   - Tạo/Update `MatchingUserAnswer` với:
     - `matchingTurnQuestionId`: ID câu hỏi trong turn
     - `userId`: ID user trả lời
     - `selectedAnswerId`: ID đáp án chọn
     - `isCorrect`: Tự động tính từ `Answer.isCorrect`
     - `answeredAt`: Thời điểm trả lời

3. **Khi hoàn thành turn:**
   - Đếm số câu đúng của mỗi user từ `MatchingUserAnswer.isCorrect`
   - Update `MatchingTurn.score` cho cả 2 players
   - Xác định `userIdWinner` (user có score cao hơn)

**Query để lấy questions của một turn:**

```sql
-- Lấy tất cả câu hỏi của turn (dùng chung cho cả 2 players)
SELECT mtq.*, qb.*
FROM MatchingTurnQuestion mtq
JOIN QuestionBank qb ON mtq.questionBankId = qb.id
WHERE mtq.matchId = ? AND mtq.turnNumber = ?
ORDER BY mtq.questionOrder
```

**Query để lấy answers của một user trong turn:**

```sql
-- Lấy tất cả câu trả lời của user trong turn
SELECT mua.*, mtq.questionOrder, qb.*, ans.*
FROM MatchingUserAnswer mua
JOIN MatchingTurnQuestion mtq ON mua.matchingTurnQuestionId = mtq.id
JOIN QuestionBank qb ON mtq.questionBankId = qb.id
LEFT JOIN Answer ans ON mua.selectedAnswerId = ans.id
WHERE mua.userId = ?
  AND mtq.matchId = ?
  AND mtq.turnNumber = ?
ORDER BY mtq.questionOrder
```

**Query để so sánh answers của 2 players trong turn:**

```sql
-- Lấy answers của cả 2 players để so sánh
SELECT
  mtq.questionOrder,
  mtq.questionBankId,
  p1_mua.selectedAnswerId as player1AnswerId,
  p1_mua.isCorrect as player1IsCorrect,
  p2_mua.selectedAnswerId as player2AnswerId,
  p2_mua.isCorrect as player2IsCorrect
FROM MatchingTurnQuestion mtq
LEFT JOIN MatchingUserAnswer p1_mua
  ON mtq.id = p1_mua.matchingTurnQuestionId AND p1_mua.userId = ?
LEFT JOIN MatchingUserAnswer p2_mua
  ON mtq.id = p2_mua.matchingTurnQuestionId AND p2_mua.userId = ?
WHERE mtq.matchId = ?
  AND mtq.turnNumber = ?
ORDER BY mtq.questionOrder
```

## 4. Implementation Steps

### Phase 1: Test Models & APIs

1. ✅ Tạo enum `TestAttemptStatus`
2. ✅ Tạo model `UserTestAttempt`
3. ✅ Tạo model `UserTestAnswerLog`
4. ✅ Tạo Repository, Service, Controller cho Test
5. ✅ Implement answer logging logic

### Phase 2: Matching Models

1. ✅ Tạo enum `MatchStatus`, `MatchResult`
2. ✅ Tạo model `Match`
3. ✅ Tạo model `MatchTurn`
4. ✅ Update `UserTestAttempt` để link với `MatchTurn`

### Phase 3: Matching Logic

1. ✅ Implement matchmaking (tìm đối thủ)
2. ✅ Implement turn management
3. ✅ Implement score calculation
4. ✅ Implement match completion logic

### Phase 4: APIs

1. ✅ Create Match API
2. ✅ Join Match API
3. ✅ Submit Turn Answer API
4. ✅ Get Match Status API
5. ✅ Get Match History API

## 5. Important Notes

### 5.1. TestSet vs Test trong Matching

- **TestSet**: Bộ đề cụ thể, có thể dùng cho nhiều turn
- **Test**: Bài test tổng hợp, có thể chứa nhiều TestSet
- **Recommendation**: Dùng TestSet cho từng turn (linh hoạt hơn)

### 5.2. Turn Question Selection

- Mỗi turn có 10 câu hỏi
- **Lưu vào `MatchingTurnQuestion`**: Đảm bảo cả 2 players làm cùng 10 câu
- Có thể random từ TestSet hoặc theo thứ tự
- `questionOrder`: Thứ tự câu hỏi (1-10)
- **Important**: Tạo `MatchingTurnQuestion` 1 lần cho turn, cả 2 players dùng chung

### 5.3. Score Calculation

- Mỗi câu đúng = 1 điểm
- Turn score = số câu đúng trong turn
- Match score = tổng điểm 3 turns
- Winner = người có match score cao hơn

### 5.4. Timing

- Có thể thêm `timeLimit` cho mỗi turn
- Track `time` trong `UserTestAttempt`
- Hoàn thành turn khi: hết thời gian hoặc submit hết 10 câu

## 6. API Endpoints Draft

```
POST   /matches              - Tạo match mới
POST   /matches/:id/join     - Join match
GET    /matches/:id          - Lấy thông tin match
POST   /matches/:id/turns/:turnNumber/answers - Submit answer cho turn
GET    /matches/:id/turns/:turnNumber/status  - Lấy status của turn
POST   /matches/:id/complete - Hoàn thành match
GET    /matches/history      - Lịch sử matches
```
