// import { Body, Controller, HttpException, HttpStatus, Logger, Post, Query, UploadedFile, UseInterceptors, Get } from '@nestjs/common';
// import { GeminiService } from './gemini.service';
// import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiProperty, ApiConsumes, ApiResponse } from '@nestjs/swagger';
// import { GenerateImageDescriptionDto, GenerateTextDto } from './dto/gemini.dto';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';

// @ApiTags('Gemini')
// @Controller('gemini')
// @ApiBearerAuth('access-token')
// export class GeminiController {
//     private readonly logger = new Logger(GeminiController.name);

//     constructor(private readonly geminiService: GeminiService) { }

//     @Post('analyze')
//     @UseInterceptors(FileInterceptor('file'))
//     @ApiConsumes('multipart/form-data')
//     @ApiOperation({ summary: 'Analyze text or image using Gemini AI' })
//     @ApiBody({
//         description: 'Gửi text (prompt) hoặc file ảnh (file) hoặc cả hai',
//         schema: {
//             type: 'object',
//             properties: {
//                 file: { type: 'string', format: 'binary', description: 'Image file (optional)' },
//                 prompt: { type: 'string', description: 'Text prompt (optional)' },
//             }
//         }
//     })
//     async analyze(
//         @UploadedFile() file: Express.Multer.File,
//         @Body('prompt') prompt?: string,
//     ): Promise<any> {
//         if (file) {
//             // Nếu có file, gọi processImage, truyền thêm prompt nếu có
//             return await this.geminiService.analyzeImageWithConcepts(file, prompt);
//         } else if (prompt) {
//             // Nếu chỉ có prompt, gọi generateText
//             return await this.geminiService.generateText(prompt);
//         } else {
//             throw new HttpException('No input provided', HttpStatus.BAD_REQUEST);
//         }
//     }

// }
