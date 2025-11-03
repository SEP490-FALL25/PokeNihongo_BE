# Prompt cho Personalized Recommendations (SRS)

## Prompt mới (cập nhật vào GeminiConfig)

```
Bạn là cố vấn ôn tập. CHỈ sử dụng dữ liệu trong {{analysis}}.

Nhiệm vụ (tùy theo endpoint):
- Endpoint SRS (/recommendations/srs): Tập trung VOCABULARY, GRAMMAR, KANJI
- Endpoint Skills (/recommendations/skills): Tập trung TEST, EXERCISE

1) Map chính xác tới content trong hệ thống:

   A) Cho VOCABULARY/GRAMMAR/KANJI:
   - Từ recentIncorrect, nếu questionType = VOCABULARY → contentType = VOCABULARY và contentId = vocabularyId (tìm trong vocabularies theo wordJp/reading khớp với questionJp)
   - Nếu questionType = GRAMMAR → contentType = GRAMMAR và contentId = grammarId (nếu có)
   - Nếu questionType = KANJI → contentType = KANJI và contentId = kanjiId (nếu có)

   B) Cho TEST/EXERCISE:
   - Từ failedTests: contentType = "TEST" và contentId = testId (ID của bài test đã làm sai, score < 60 hoặc status = FAIL)
   - Từ failedExercises: contentType = "EXERCISE" và contentId = exerciseId (ID của bài exercise đã làm sai, status = FAIL/ABANDONED)
   - Ưu tiên test/exercise có questionTypes chứa LISTENING, READING, SPEAKING

2) Loại bỏ những content đã có SRS hiện hành (có trong srs.existing dạng "VOCABULARY-123" hoặc "TEST-456").

3) Ưu tiên:
   - Sai lặp lại nhiều lần (check questionBankId trùng)
   - Cấp độ thấp (levelN cao hơn = khó hơn, nhưng cần ưu tiên ôn lại)
   - Sai trong 7 ngày gần nhất

4) Trả về đúng {{limit}} mục.

5) CHỈ TRẢ JSON array dạng:
[
  { "contentType": "VOCABULARY"|"GRAMMAR"|"KANJI"|"TEST"|"EXERCISE", "contentId": <number>, "reason": "<ngắn gọn>", "priority": "high"|"medium"|"low" }
]

Lưu ý:
- Cho VOCABULARY/GRAMMAR/KANJI: contentId phải có trong vocabularies (không bịa ID)
- Cho TEST: contentId = testId từ failedTests
- Cho EXERCISE: contentId = exerciseId từ failedExercises
- Không thêm bất kỳ text nào ngoài JSON. Nếu không đủ dữ liệu, trả mảng rỗng.
```

## Policy JSON đầy đủ

```json
{
  "policy": {
    "purpose": "PERSONALIZED_RECOMMENDATIONS",
    "entities": [
      {
        "entity": "UserProgress",
        "scope": "SELF_ONLY",
        "fields": ["lessonId", "progressPercentage", "lastAccessedAt"]
      },
      {
        "entity": "UserExerciseAttempt",
        "scope": "SELF_ONLY",
        "fields": ["id", "exerciseId", "status", "updatedAt"]
      },
      {
        "entity": "UserAnswerLog",
        "scope": "SELF_ONLY",
        "fields": [
          "userExerciseAttemptId",
          "questionBankId",
          "answerId",
          "isCorrect",
          "createdAt"
        ]
      },
      {
        "entity": "UserTestAttempt",
        "scope": "SELF_ONLY",
        "fields": ["id", "testId", "status", "score", "updatedAt"]
      },
      {
        "entity": "UserTestAnswerLog",
        "scope": "SELF_ONLY",
        "fields": [
          "userTestAttemptId",
          "questionBankId",
          "answerId",
          "isCorrect",
          "createdAt"
        ]
      },
      {
        "entity": "QuestionBank",
        "scope": "PUBLIC",
        "fields": ["id", "questionType", "levelN", "questionJp"]
      },
      {
        "entity": "Answer",
        "scope": "PUBLIC",
        "fields": ["id", "questionBankId", "isCorrect", "answerJp"]
      },
      {
        "entity": "UserSrsReview",
        "scope": "SELF_ONLY",
        "fields": [
          "contentType",
          "contentId",
          "srsLevel",
          "nextReviewDate",
          "incorrectStreak",
          "isLeech",
          "updatedAt"
        ]
      },
      {
        "entity": "Vocabulary",
        "scope": "PUBLIC",
        "fields": ["id", "wordJp", "reading", "levelN"]
      }
    ],
    "maskingRules": { "email": "mask", "phoneNumber": "mask" }
  }
}
```

## Cách sử dụng

1. **Update prompt trong GeminiConfig:**

   - PATCH `/gemini-config/:id` với prompt mới ở trên

2. **Update policy:**

   - PATCH `/gemini-config/config-models/:id/policy` với policy JSON ở trên

3. **Test API:**

   - POST `/gemini/recommendations` (multipart: limit=10, useServiceAccount=false)

4. **Kết quả:**
   - AI sẽ trả về `{ contentType, contentId, reason, priority }`
   - Hệ thống tự động tạo/update `UserSrsReview` cho các content đó
   - Response UI: `{ title: "Làm lại để cải thiện", items: [...] }`
