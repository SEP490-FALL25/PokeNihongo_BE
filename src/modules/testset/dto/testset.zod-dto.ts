import { createZodDto } from 'nestjs-zod'
import {
    CreateTestSetBodySchema,
    UpdateTestSetBodySchema,
    TestSetResSchema,
    TestSetListResSchema,
    TestSetWithQuestionsResSchema,
    GetTestSetByIdParamsSchema,
    GetTestSetListQuerySchema,
} from '../entities/testset.entities'

// Create TestSet DTO
export class CreateTestSetBodyDTO extends createZodDto(CreateTestSetBodySchema) { }

// Update TestSet DTO
export class UpdateTestSetBodyDTO extends createZodDto(UpdateTestSetBodySchema) { }

// TestSet Response DTO
export class TestSetResDTO extends createZodDto(TestSetResSchema) { }

// TestSet List Response DTO
export class TestSetListResDTO extends createZodDto(TestSetListResSchema) { }

// TestSet with Questions Response DTO
export class TestSetWithQuestionsResDTO extends createZodDto(TestSetWithQuestionsResSchema) { }

// Get TestSet by ID Params DTO
export class GetTestSetByIdParamsDTO extends createZodDto(GetTestSetByIdParamsSchema) { }

// Get TestSet List Query DTO
export class GetTestSetListQueryDTO extends createZodDto(GetTestSetListQuerySchema) { }

