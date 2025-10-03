# Pattern Refactoring - Theo Mẫu Auth Module

## 📁 Cấu trúc thư mục chuẩn cho mỗi module:

```
src/modules/{module-name}/
├── dto/
│   ├── zod/
│   │   └── {module}.zod-dto.ts    // Zod DTOs (validation)
│   ├── {module}.dto.ts             // Swagger DTOs (documentation)
│   └── {module}.error.ts           // Custom error exceptions
├── entities/
│   └── {module}.entities.ts        // Zod schemas
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.repo.ts
└── {module}.module.ts
```

## ✅ Đã hoàn thành:

### **Languages Module** ✓

- `dto/zod/languages-zod.dto.ts` ✓
- `dto/languages.dto.ts` ✓ (Swagger DTOs)
- `dto/languages.error.ts` ✓

### **Kanji Module** ✓

- `dto/zod/kanji.zod-dto.ts` ✓ (MỚI TẠO)
- `dto/kanji.dto.ts` ✓ (MỚI TẠO - chỉ Swagger DTOs)
- `dto/kanji.error.ts` ✓ (đã có)

## 📝 Cần làm cho các module còn lại:

### **Kanji Reading Module**

1. Tạo `dto/zod/kanji-reading.zod-dto.ts` (đã có rồi)
2. Cập nhật `dto/kanji-reading.dto.ts` để tách Swagger DTOs
3. `dto/kanji-reading.error.ts` đã có ✓

### **Meaning Module**

1. Tạo `dto/zod/meaning.zod-dto.ts` (đã có rồi)
2. Cập nhật `dto/meaning.dto.ts`
3. `dto/meaning.error.ts` đã có ✓

### **Translation Module**

1. Tạo `dto/zod/translation.zod-dto.ts`
2. Cập nhật `dto/translation.dto.ts`
3. `dto/translation.error.ts` đã có ✓

### **WordType Module**

1. Tạo `dto/zod/wordtype.zod-dto.ts` (đã có rồi)
2. Cập nhật `dto/wordtype.dto.ts`
3. `dto/wordtype.error.ts` đã có ✓

## 🎯 Pattern cho từng file:

### **1. zod/{module}.zod-dto.ts**

```typescript
import { createZodDto } from 'nestjs-zod'
import {
  CreateXxxSchema,
  UpdateXxxSchema,
  XxxSchema
  // ... other schemas
} from '../../entities/{module}.entities'

// Zod DTOs - tự động validate
export class CreateXxxBodyDTO extends createZodDto(CreateXxxSchema) {}
export class UpdateXxxBodyDTO extends createZodDto(UpdateXxxSchema) {}
export class XxxResponseDTO extends createZodDto(XxxSchema) {}
// ...
```

### **2. {module}.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger'

// Export Zod DTOs
export {
  CreateXxxBodyDTO,
  UpdateXxxBodyDTO,
  XxxResponseDTO
  // ...
} from './zod/{module}.zod-dto'

// Swagger DTOs - CHỈ dùng cho API documentation
export class CreateXxxSwaggerDTO {
  @ApiProperty({ example: 'value', description: 'Description' })
  field: string
}

export class XxxSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID' })
  id: number
  // ...
}
```

### **3. {module}.error.ts**

```typescript
import { HttpException, HttpStatus } from '@nestjs/common'
import { XXX_MESSAGE } from '@/common/constants/message'

export const XxxNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: XXX_MESSAGE.NOT_FOUND,
    error: 'XXX_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const XxxAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: XXX_MESSAGE.ALREADY_EXISTS,
    error: 'XXX_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)
// ...
```

## 🔧 Cách sử dụng trong Controller:

```typescript
import {
    CreateXxxBodyDTO,      // Zod DTO - cho @Body() validation
    XxxResponseDTO,        // Zod DTO - cho @ZodSerializerDto()
    CreateXxxSwaggerDTO,   // Swagger DTO - cho @ApiBody()
    XxxSwaggerResponseDTO  // Swagger DTO - cho @ApiResponse()
} from './dto/{module}.dto'

@Post()
@ApiBody({ type: CreateXxxSwaggerDTO })           // Swagger
@ApiResponse({ type: XxxSwaggerResponseDTO })     // Swagger
@ZodSerializerDto(XxxResponseDTO)                 // Zod validation
create(@Body() body: CreateXxxBodyDTO) {          // Zod validation
    return this.service.create(body)
}
```

## ✨ Lợi ích:

1. **Tách biệt concerns**:

   - Zod DTOs = Runtime validation
   - Swagger DTOs = API documentation

2. **Type safety**: Zod schemas đảm bảo type safety

3. **DRY**: Không duplicate code

4. **Maintainability**: Dễ bảo trì và mở rộng

5. **Error handling**: Custom errors rõ ràng, nhất quán

## 📌 Lưu ý:

- **List endpoints**: KHÔNG dùng `@ZodSerializerDto` (sẽ lỗi serialization)
- **Single item endpoints**: Dùng `@ZodSerializerDto(XxxResponseDTO)`
- **Error files**: Đã có sẵn cho tất cả modules, chỉ cần review
- **Zod DTO files**: Hầu hết đã có ở subfolder `zod/`, chỉ cần tách Swagger DTOs ra

