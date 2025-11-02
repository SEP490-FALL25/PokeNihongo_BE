# Hướng dẫn API - Luồng làm Test của User

## Mục lục

1. [Lấy danh sách Test của user](#1-lấy-danh-sách-test-của-user)
2. [Bắt đầu làm test](#2-bắt-đầu-làm-test)
3. [Lưu câu trả lời](#3-lưu-câu-trả-lời)
4. [Nộp bài](#4-nộp-bài)
5. [Xem kết quả chi tiết](#5-xem-kết-quả-chi-tiết)

---

## 1. Lấy danh sách Test của user

**Endpoint:** `GET /user-test/my`

**Authentication:** Required (Bearer Token)

**Description:** Lấy danh sách tất cả test mà user hiện tại đang có quyền truy cập.

### Request

**Headers:**

```
Authorization: Bearer {access_token}
Accept-Language: vi (hoặc en)
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| currentPage | number | No | 1 | Trang hiện tại |
| pageSize | number | No | 10 | Số item mỗi trang |
| status | string | No | - | Filter theo status (NOT_STARTED, ACTIVE) |
| testType | string | No | - | Filter theo loại test |

**Example:**

```
GET /user-test/my?currentPage=1&pageSize=10&status=ACTIVE
GET /user-test/my?testType=VOCABULARY&status=ACTIVE
```

### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách UserTest thành công",
  "data": {
    "results": [
      {
        "id": 1,
        "userId": 10,
        "status": "ACTIVE",
        "limit": 5,
        "test": {
          "id": 1,
          "name": "Kiểm tra từ vựng N3",
          "description": "Bài kiểm tra từ vựng N3",
          "price": 0,
          "levelN": 3,
          "testType": "VOCABULARY",
          "status": "ACTIVE",
          "limit": 5
        }
      },
      {
        "id": 2,
        "userId": 10,
        "status": "ACTIVE",
        "limit": null,
        "test": {
          "id": 2,
          "name": "Bài thi thử JLPT N3",
          "description": "Bài thi thử đầy đủ N3",
          "price": 0,
          "levelN": 3,
          "testType": "SUBSCRIPTION_TEST",
          "status": "ACTIVE",
          "limit": null
        }
      }
    ],
    "pagination": {
      "current": 1,
      "pageSize": 10,
      "totalPage": 3,
      "totalItem": 25
    }
  }
}
```

**Error Responses:**

| Status Code | Description                   |
| ----------- | ----------------------------- |
| 401         | Unauthorized - Chưa đăng nhập |
| 500         | Internal Server Error         |

---

## 2. Bắt đầu làm test

**Endpoint:** `GET /user-test-attempt/:id`

**Authentication:** Required (Bearer Token)

**Description:**

- Bắt đầu làm một bài test cụ thể
- Hệ thống sẽ tự động:
  - Kiểm tra UserTest tồn tại
  - Validate limit (nếu có)
  - **Trừ 1 limit** của user
  - Tạo attempt mới
  - Trả về danh sách câu hỏi và đáp án

### Request

**Headers:**

```
Authorization: Bearer {access_token}
Accept-Language: vi (hoặc en)
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | ID của Test |

**Example:**

```
GET /user-test-attempt/1
```

### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin bài test thành công",
  "data": {
    "id": 1,
    "name": "Kiểm tra từ vựng N3",
    "description": "Bài kiểm tra từ vựng N3",
    "testType": "VOCABULARY",
    "testSets": [
      {
        "id": 1,
        "name": "Phần 1: Danh từ",
        "description": "Kiểm tra danh từ cơ bản N3",
        "content": null,
        "audioUrl": null,
        "testType": "VOCABULARY",
        "testSetQuestionBanks": [
          {
            "id": 1,
            "questionOrder": 1,
            "questionBank": {
              "id": 100,
              "question": "『本』の読み方は？",
              "questionType": "VOCABULARY",
              "audioUrl": null,
              "pronunciation": null,
              "answers": [
                {
                  "id": 400,
                  "answer": "ほん"
                },
                {
                  "id": 401,
                  "answer": "はん"
                },
                {
                  "id": 402,
                  "answer": "ばん"
                },
                {
                  "id": 403,
                  "answer": "ぱん"
                }
              ]
            }
          },
          {
            "id": 2,
            "questionOrder": 2,
            "questionBank": {
              "id": 101,
              "question": "『食べる』の意味は？",
              "questionType": "VOCABULARY",
              "audioUrl": null,
              "pronunciation": null,
              "answers": [
                {
                  "id": 404,
                  "answer": "to eat"
                },
                {
                  "id": 405,
                  "answer": "to drink"
                },
                {
                  "id": 406,
                  "answer": "to sleep"
                },
                {
                  "id": 407,
                  "answer": "to run"
                }
              ]
            }
          }
        ]
      }
    ],
    "userTestAttemptId": 50,
    "totalQuestions": 10,
    "answeredQuestions": 0,
    "time": 0
  }
}
```

**⚠️ Lưu ý quan trọng:**

- API này sẽ **trừ 1 limit** ngay khi gọi, không phải khi nộp bài
- Nếu limit = 0 sau khi trừ, UserTest status sẽ chuyển thành `NOT_STARTED`
- Mỗi lần gọi sẽ tạo attempt mới hoàn toàn (không có tiếp tục attempt cũ)

**Error Responses:**

| Status Code | Description                                          |
| ----------- | ---------------------------------------------------- |
| 400         | Bad Request - Không tìm thấy UserTest hoặc hết limit |
| 401         | Unauthorized - Chưa đăng nhập                        |
| 403         | Forbidden - Không có quyền truy cập attempt này      |
| 500         | Internal Server Error                                |

**Error Example (hết limit):**

```json
{
  "statusCode": 400,
  "message": "Bạn đã hết lượt làm bài test này"
}
```

---

## 3. Lưu câu trả lời

**Endpoint:** `POST /user-test-answer-log`

**Authentication:** Required (Bearer Token)

**Description:** Lưu hoặc cập nhật câu trả lời của user cho một câu hỏi cụ thể.

### Request

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**

```json
{
  "userTestAttemptId": 50,
  "questionBankId": 100,
  "answerId": 400
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userTestAttemptId | number | Yes | ID của UserTestAttempt |
| questionBankId | number | Yes | ID của QuestionBank (câu hỏi) |
| answerId | number | Yes | ID của Answer mà user chọn |

### Response

**Success (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Tạo UserTestAnswerLog thành công",
  "data": {
    "id": 1000,
    "userTestAttemptId": 50,
    "questionBankId": 100,
    "answerId": 400,
    "isCorrect": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**If already exists (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Cập nhật UserTestAnswerLog thành công",
  "data": {
    "id": 1000,
    "userTestAttemptId": 50,
    "questionBankId": 100,
    "answerId": 400,
    "isCorrect": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:05:00.000Z"
  }
}
```

**Error Responses:**

| Status Code | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| 400         | Bad Request - Invalid data hoặc attempt không thuộc về user         |
| 401         | Unauthorized - Chưa đăng nhập                                       |
| 404         | Not Found - UserTestAttempt, QuestionBank hoặc Answer không tồn tại |
| 500         | Internal Server Error                                               |

**Error Example:**

```json
{
  "statusCode": 400,
  "message": "UserTestAttempt không thuộc về user hiện tại"
}
```

---

## 4. Nộp bài

**Endpoint:** `POST /user-test-attempt/:id/submit`

**Authentication:** Required (Bearer Token)

**Description:** Nộp bài test và nhận kết quả điểm.

### Request

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | ID của UserTestAttempt |

**Example:**

```
POST /user-test-attempt/50/submit
```

### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Nộp bài test thành công",
  "data": {
    "id": 50,
    "userId": 10,
    "testId": 1,
    "time": 1200,
    "score": 70,
    "status": "COMPLETED",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:20:00.000Z"
  }
}
```

**Logic tính điểm:**

- Tỷ lệ đúng >= 60% → `status = COMPLETED`
- Tỷ lệ đúng < 60% → `status = FAIL`

**Error Responses:**

| Status Code | Description                                            |
| ----------- | ------------------------------------------------------ |
| 400         | Bad Request - Attempt đã được submit hoặc invalid data |
| 401         | Unauthorized - Chưa đăng nhập                          |
| 403         | Forbidden - Attempt không thuộc về user hiện tại       |
| 404         | Not Found - UserTestAttempt không tồn tại              |
| 500         | Internal Server Error                                  |

**Error Example (đã submit):**

```json
{
  "statusCode": 400,
  "message": "Attempt này đã được submit rồi"
}
```

---

## 5. Xem kết quả chi tiết

**Endpoint:** `GET /user-test-attempt/:id/review`

**Authentication:** Required (Bearer Token)

**Description:**

- Xem chi tiết đáp án đúng/sai của bài test
- **Yêu cầu:** User phải đạt >= 80% điểm đúng
- Trả về:
  - Câu nào đúng
  - Câu nào sai
  - Đáp án đúng là gì
  - Giải thích cho từng đáp án

### Request

**Headers:**

```
Authorization: Bearer {access_token}
Accept-Language: vi (hoặc en)
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | ID của UserTestAttempt |

**Example:**

```
GET /user-test-attempt/50/review
```

### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin đáp án bài test thành công",
  "data": {
    "id": 1,
    "name": "Kiểm tra từ vựng N3",
    "description": "Bài kiểm tra từ vựng N3",
    "testType": "VOCABULARY",
    "testSets": [
      {
        "id": 1,
        "name": "Phần 1: Danh từ",
        "description": "Kiểm tra danh từ cơ bản N3",
        "content": null,
        "audioUrl": null,
        "testType": "VOCABULARY",
        "testSetQuestionBanks": [
          {
            "id": 1,
            "questionOrder": 1,
            "questionBank": {
              "id": 100,
              "question": "『本』の読み方は？",
              "isCorrect": true,
              "answers": [
                {
                  "id": 400,
                  "answer": "ほん",
                  "type": "correct_answer",
                  "explantion": "『本』は『ほん』と読みます。意味は『book』です。"
                },
                {
                  "id": 401,
                  "answer": "はん"
                },
                {
                  "id": 402,
                  "answer": "ばん"
                },
                {
                  "id": 403,
                  "answer": "ぱん"
                }
              ]
            }
          },
          {
            "id": 2,
            "questionOrder": 2,
            "questionBank": {
              "id": 101,
              "question": "『食べる』の意味は？",
              "isCorrect": false,
              "answers": [
                {
                  "id": 404,
                  "answer": "to eat",
                  "type": "correct_answer",
                  "explantion": "『食べる』は『to eat』という意味です。"
                },
                {
                  "id": 405,
                  "answer": "to drink",
                  "type": "user_selected_incorrect",
                  "explantion": "『飲む』は『to drink』という意味です。"
                },
                {
                  "id": 406,
                  "answer": "to sleep"
                },
                {
                  "id": 407,
                  "answer": "to run"
                }
              ]
            }
          }
        ]
      }
    ],
    "totalQuestions": 10,
    "answeredCorrect": 8,
    "answeredInCorrect": 2,
    "time": 1200,
    "status": "COMPLETED",
    "score": 80
  }
}
```

**Answer Types:**

- `correct_answer`: Đáp án đúng
- `user_selected_incorrect`: Đáp án user chọn nhưng sai

**Error Responses:**

| Status Code | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| 403         | Forbidden - Chưa đạt 80% điểm đúng hoặc attempt không thuộc về user |
| 401         | Unauthorized - Chưa đăng nhập                                       |
| 404         | Not Found - UserTestAttempt không tồn tại                           |
| 500         | Internal Server Error                                               |

**Error Example (chưa đủ điểm):**

```json
{
  "statusCode": 403,
  "message": "Bạn cần đạt ít nhất 80% số câu trả lời đúng để xem đáp án",
  "data": {
    "status": "COMPLETED",
    "totalQuestions": 10,
    "answeredCorrect": 7,
    "correctPercentage": 70,
    "minimumRequired": 80
  }
}
```

**Error Example (chưa nộp bài):**

```json
{
  "statusCode": 200,
  "message": "Bài test chưa hoàn thành",
  "data": {
    "status": "NOT_STARTED"
  }
}
```

---

## Luồng hoàn chỉnh

### Ví dụ: User làm test từ đầu đến cuối

#### Bước 1: Lấy danh sách test

```bash
GET /user-test/my?status=ACTIVE
```

Response: Danh sách test mà user có thể làm

#### Bước 2: Chọn test và bắt đầu làm

```bash
GET /user-test-attempt/1
```

Response: Danh sách câu hỏi và đáp án (đã trừ 1 limit)

#### Bước 3: Lưu từng câu trả lời

```bash
POST /user-test-answer-log
Body: { "userTestAttemptId": 50, "questionBankId": 100, "answerId": 400 }

POST /user-test-answer-log
Body: { "userTestAttemptId": 50, "questionBankId": 101, "answerId": 405 }

... (lưu cho tất cả câu hỏi)
```

#### Bước 4: Nộp bài

```bash
POST /user-test-attempt/50/submit
```

Response: Kết quả (score, status)

#### Bước 5: Xem đáp án (nếu >= 80%)

```bash
GET /user-test-attempt/50/review
```

Response: Chi tiết đáp án đúng/sai

---

## Các loại Test

| TestType            | Description    | Special Features                      |
| ------------------- | -------------- | ------------------------------------- |
| VOCABULARY          | Test từ vựng   | Thường có pronunciation               |
| GRAMMAR             | Test ngữ pháp  | -                                     |
| KANJI               | Test chữ Hán   | -                                     |
| READING             | Test đọc hiểu  | Có `content` chứa đoạn văn            |
| LISTENING           | Test nghe hiểu | Có `audioUrl` cho listening           |
| SPEAKING            | Test nói       | Có `pronunciation` field              |
| PLACEMENT_TEST_DONE | Test đầu vào   | Chỉ có 1 test duy nhất trong hệ thống |
| SUBSCRIPTION_TEST   | Test thuê bao  | Status mặc định NOT_STARTED           |
| MATCH_TEST          | Test matching  | Không tự động add vào UserTest        |
| GENERAL             | Test tổng hợp  | Cho phép mọi questionType             |

---

## Limit Management

### Giới hạn số lần làm bài

**Limit values:**

- `null`: Không giới hạn (unlimited)
- `0`: Không cho phép làm
- `> 0`: Số lần còn lại

**Cách hoạt động:**

1. User có `limit = 5`
2. User gọi `GET /user-test-attempt/:id` lần 1
   - System trừ 1 → `limit = 4`
3. User gọi `GET /user-test-attempt/:id` lần 2
   - System trừ 1 → `limit = 3`
4. ...
5. User gọi `GET /user-test-attempt/:id` lần 5
   - System trừ 1 → `limit = 0`
   - System chuyển `status = NOT_STARTED`
6. User gọi `GET /user-test-attempt/:id` lần 6
   - System check: `limit = 0`
   - System return error: `OUT_OF_LIMIT`

**Lưu ý:**

- Limit được trừ **ngay khi vào làm**, không phải khi nộp bài
- Nếu user vào rồi thoát ra mà không nộp, limit vẫn bị trừ
- Auto-update limit mỗi ngày từ Test.limit (trừ PLACEMENT_TEST_DONE)

---

## Best Practices

### 1. **Frontend nên cache danh sách test**

- Lấy danh sách test 1 lần khi vào trang
- Chỉ reload khi cần

### 2. **Validate trước khi nộp bài**

- Check xem đã trả lời đủ câu chưa
- Hiển thị thông báo cho user biết

### 3. **Handle error gracefully**

- Hết limit → Show UI thông báo rõ ràng
- Chưa đủ 80% → Hiển thị điểm và yêu cầu 80%
- Network error → Retry hoặc save local

### 4. **Save progress locally**

- Lưu câu trả lời vào localStorage khi làm bài
- Load lại khi refresh trang (chưa submit)

### 5. **Countdown timer**

- Hiển thị thời gian còn lại
- Warn user khi sắp hết giờ

---

## Testing Examples

### Example 1: Happy Path

```bash
# 1. List tests
GET /user-test/my
→ Get test id = 1

# 2. Start attempt
GET /user-test-attempt/1
→ Get userTestAttemptId = 50

# 3. Save answers
POST /user-test-answer-log
{ "userTestAttemptId": 50, "questionBankId": 100, "answerId": 400 }

POST /user-test-answer-log
{ "userTestAttemptId": 50, "questionBankId": 101, "answerId": 404 }

# 4. Submit
POST /user-test-attempt/50/submit
→ Get score: 100 (2/2 correct)

# 5. View review
GET /user-test-attempt/50/review
→ Get full review with explanations
```

### Example 2: Out of Limit

```bash
# User có limit = 1

GET /user-test-attempt/1
→ Success, limit = 0

GET /user-test-attempt/1
→ Error 400: OUT_OF_LIMIT
```

### Example 3: Insufficient Score

```bash
# User submit với 7/10 đúng (70%)

POST /user-test-attempt/50/submit
→ Success, score: 70, status: COMPLETED

GET /user-test-attempt/50/review
→ Error 403: REVIEW_INSUFFICIENT_SCORE
→ Need 80%
```

---

## FAQ

### Q: Có thể làm lại test không?

A: Có, nếu còn limit. Mỗi lần làm sẽ tạo attempt mới.

### Q: Sau khi trừ limit, có thể hoàn lại không?

A: Không. Limit được trừ ngay khi vào làm, không hoàn lại.

### Q: Có thể xem đáp án khi chưa nộp không?

A: Không, phải nộp bài trước.

### Q: Có thể xem đáp án khi < 80% không?

A: Không, phải đạt >= 80% mới được xem review.

### Q: Test READNG và LISTENING có gì đặc biệt?

A:

- READING có field `content` chứa đoạn văn để đọc
- LISTENING có field `audioUrl` để nghe audio

### Q: Limit được cập nhật như thế nào?

A: Auto-update mỗi ngày lúc 00:00 giờ HCM từ Test.limit.

### Q: Test có bao nhiêu câu hỏi?

A: Tùy test, có thể 10, 20, 50, 100+ câu hỏi.

### Q: Thời gian làm bài có giới hạn không?

A: Không có giới hạn ở API level, frontend tự quản lý.

---

## Support

Nếu gặp vấn đề, vui lòng liên hệ:

- Email: support@example.com
- Documentation: https://docs.example.com
- API Status: https://status.example.com
