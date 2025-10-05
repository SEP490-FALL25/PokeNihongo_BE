import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadResult } from './upload.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryImageMulterConfig, CloudinaryAudioMulterConfig, CloudinaryMultiMulterConfig } from './cloudinary/multer.config';

@Controller('upload')
@ApiBearerAuth('access-token')
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload file chung' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Upload thành công',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                url: { type: 'string' },
                publicId: { type: 'string' }
            }
        }
    })
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
        return this.uploadService.uploadFile(file, 'uploads');
    }

    @Post('vocabulary/image')
    @UseInterceptors(FileInterceptor('image', CloudinaryImageMulterConfig))
    @ApiOperation({ summary: 'Upload hình ảnh cho từ vựng' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Hình ảnh từ vựng (jpg, png, gif)'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Upload hình ảnh thành công',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                url: { type: 'string' },
                publicId: { type: 'string' }
            }
        }
    })
    async uploadVocabularyImage(@UploadedFile() image: Express.Multer.File): Promise<UploadResult> {
        const url = await this.uploadService.uploadVocabularyImage(image);
        return {
            message: 'Upload hình ảnh từ vựng thành công!',
            url,
            publicId: this.uploadService['extractPublicIdFromUrl'](url) || undefined
        };
    }

    @Post('vocabulary/audio')
    @UseInterceptors(FileInterceptor('audio', CloudinaryAudioMulterConfig))
    @ApiOperation({ summary: 'Upload âm thanh cho từ vựng' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                audio: {
                    type: 'string',
                    format: 'binary',
                    description: 'File âm thanh từ vựng (mp3, wav, ogg)'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Upload âm thanh thành công',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                url: { type: 'string' },
                publicId: { type: 'string' }
            }
        }
    })
    async uploadVocabularyAudio(@UploadedFile() audio: Express.Multer.File): Promise<UploadResult> {
        const url = await this.uploadService.uploadVocabularyAudio(audio);
        return {
            message: 'Upload âm thanh từ vựng thành công!',
            url,
            publicId: this.uploadService['extractPublicIdFromUrl'](url) || undefined
        };
    }

    @Post('vocabulary/files')
    @UseInterceptors(FilesInterceptor('files', 2, CloudinaryMultiMulterConfig))
    @ApiOperation({ summary: 'Upload cả hình ảnh và âm thanh cho từ vựng' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary'
                    },
                    description: 'Files (hình ảnh và âm thanh)',
                    maxItems: 2
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Upload files thành công',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                imageUrl: { type: 'string' },
                audioUrl: { type: 'string' }
            }
        }
    })
    async uploadVocabularyFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('oldImageUrl') oldImageUrl?: string,
        @Body('oldAudioUrl') oldAudioUrl?: string
    ) {
        const imageFile = files.find(file => file.mimetype.startsWith('image/'));
        const audioFile = files.find(file => file.mimetype.startsWith('audio/'));

        const results = await this.uploadService.uploadVocabularyFiles(
            imageFile,
            audioFile,
            oldImageUrl,
            oldAudioUrl
        );

        return {
            message: 'Upload files từ vựng thành công!',
            ...results
        };
    }
}
