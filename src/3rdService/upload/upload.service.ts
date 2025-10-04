import { Injectable, Inject, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

export interface UploadResult {
    message: string;
    url: string;
    publicId?: string;
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    constructor(@Inject('Cloudinary') private cloudinary) { }

    private isImageFile(mimetype: string): boolean {
        return mimetype.startsWith('image/');
    }

    private isAudioFile(mimetype: string): boolean {
        return mimetype.startsWith('audio/');
    }

    async resizeImage(file: Express.Multer.File): Promise<Buffer> {
        try {
            // Validate file buffer
            if (!file.buffer || file.buffer.length === 0) {
                this.logger.warn(`File buffer is empty for ${file.originalname}, skipping resize`);
                return file.buffer;
            }

            // Check if it's a valid image format
            const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!supportedFormats.includes(file.mimetype)) {
                this.logger.warn(`Unsupported image format: ${file.mimetype}, skipping resize`);
                return file.buffer;
            }

            this.logger.log(`Resizing image: ${file.originalname}, size: ${file.buffer.length} bytes, mimetype: ${file.mimetype}`);

            return await sharp(file.buffer)
                .resize({ width: 800, height: 800, fit: 'inside' }) // Resize về 800x800, giữ tỷ lệ
                .toBuffer();
        } catch (error) {
            this.logger.warn(`Error resizing image ${file.originalname}, using original: ${error.message}`);
            return file.buffer; // Return original buffer if resize fails
        }
    }

    async uploadFile(file: Express.Multer.File, folder: string): Promise<UploadResult> {
        const startTime = Date.now();
        this.logger.log(`Starting upload for file: ${file.originalname} to folder: ${folder}`);

        try {
            let uploadBuffer = file.buffer;
            let resourceType: 'image' | 'video' | 'raw' = 'raw';

            // Xử lý hình ảnh
            if (this.isImageFile(file.mimetype)) {
                try {
                    uploadBuffer = await this.resizeImage(file);
                } catch (error) {
                    this.logger.warn(`Failed to resize image, using original: ${error.message}`);
                    uploadBuffer = file.buffer; // Fallback to original buffer
                }
                resourceType = 'image';
            }
            // Xử lý audio
            else if (this.isAudioFile(file.mimetype)) {
                resourceType = 'video'; // Cloudinary treats audio as video resource type
            }

            return new Promise((resolve, reject) => {
                const uploadStream = this.cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: resourceType,
                        timeout: 60000,
                        use_filename: true,
                        unique_filename: true
                    },
                    (error, result: UploadApiResponse) => {
                        if (error) {
                            this.logger.error(`Upload failed for ${file.originalname}: ${error.message}`);
                            return reject(new Error('Upload failed!'));
                        }
                        this.logger.log(`Upload completed for ${file.originalname} in ${Date.now() - startTime}ms`);
                        resolve({
                            message: 'Upload thành công!',
                            url: result.secure_url,
                            publicId: result.public_id
                        });
                    },
                );

                uploadStream.end(uploadBuffer);
            });
        } catch (error) {
            this.logger.error(`Error processing file ${file.originalname}: ${error.message}`);
            throw new Error('File processing failed!');
        }
    }

    async uploadVocabularyImage(file: Express.Multer.File, oldImageUrl?: string): Promise<string> {
        const startTime = Date.now();
        this.logger.log(`Starting vocabulary image upload for file: ${file.originalname}`);

        if (!this.isImageFile(file.mimetype)) {
            throw new Error('File must be an image');
        }

        // Check if original file buffer is valid first
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error(`Original file buffer is empty for ${file.originalname}`);
        }

        let resizedBuffer: Buffer;
        try {
            resizedBuffer = await this.resizeImage(file);
        } catch (error) {
            this.logger.warn(`Failed to resize image ${file.originalname}, using original: ${error.message}`);
            resizedBuffer = file.buffer; // Use original buffer as fallback
        }

        // Check if buffer is valid
        if (!resizedBuffer || resizedBuffer.length === 0) {
            throw new Error('Empty file');
        }

        return new Promise((resolve, reject) => {
            const uploadNewImage = () => {
                this.cloudinary.uploader.upload_stream(
                    {
                        folder: 'vocabulary/images',
                        resource_type: 'image',
                        timeout: 60000,
                        use_filename: true,
                        unique_filename: true
                    },
                    (error, result: UploadApiResponse) => {
                        if (error) {
                            this.logger.error(`Image upload failed for ${file.originalname}: ${error.message}`);
                            return reject(error);
                        }
                        this.logger.log(`Image upload completed for ${file.originalname} in ${Date.now() - startTime}ms`);
                        resolve(result.secure_url);
                    },
                ).end(resizedBuffer);
            };

            if (oldImageUrl) {
                this.deleteFile(oldImageUrl, 'vocabulary/images')
                    .then(() => {
                        this.logger.log(`Deleted old image`);
                        uploadNewImage();
                    })
                    .catch((error) => {
                        this.logger.warn(`Failed to delete old image: ${error.message}`);
                        uploadNewImage(); // Continue with upload even if delete fails
                    });
            } else {
                uploadNewImage();
            }
        });
    }

    async uploadVocabularyAudio(file: Express.Multer.File, oldAudioUrl?: string): Promise<string> {
        const startTime = Date.now();
        this.logger.log(`Starting vocabulary audio upload for file: ${file.originalname}`);

        if (!this.isAudioFile(file.mimetype)) {
            throw new Error('File must be an audio file');
        }

        return new Promise((resolve, reject) => {
            const uploadNewAudio = () => {
                this.cloudinary.uploader.upload_stream(
                    {
                        folder: 'vocabulary/audio',
                        resource_type: 'video', // Cloudinary treats audio as video
                        timeout: 120000, // Longer timeout for audio files
                        use_filename: true,
                        unique_filename: true
                    },
                    (error, result: UploadApiResponse) => {
                        if (error) {
                            this.logger.error(`Audio upload failed for ${file.originalname}: ${error.message}`);
                            return reject(error);
                        }
                        this.logger.log(`Audio upload completed for ${file.originalname} in ${Date.now() - startTime}ms`);
                        resolve(result.secure_url);
                    },
                ).end(file.buffer);
            };

            if (oldAudioUrl) {
                this.deleteFile(oldAudioUrl, 'vocabulary/audio')
                    .then(() => {
                        this.logger.log(`Deleted old audio`);
                        uploadNewAudio();
                    })
                    .catch((error) => {
                        this.logger.warn(`Failed to delete old audio: ${error.message}`);
                        uploadNewAudio(); // Continue with upload even if delete fails
                    });
            } else {
                uploadNewAudio();
            }
        });
    }

    async deleteFile(url: string, folder: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Extract public_id from URL
            const publicId = this.extractPublicIdFromUrl(url);
            if (!publicId) {
                return reject(new Error('Invalid URL format'));
            }

            this.cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) {
                    this.logger.error(`Failed to delete file ${publicId}: ${error.message}`);
                    return reject(error);
                }
                this.logger.log(`Deleted file ${publicId}`);
                resolve();
            });
        });
    }

    private extractPublicIdFromUrl(url: string): string | null {
        try {
            // Extract public_id from Cloudinary URL
            // Example: https://res.cloudinary.com/cloud_name/video/upload/v1234567890/vocabulary/audio/filename.mp3
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex === -1) return null;

            // Get everything after 'upload/' and before the last part (filename)
            const pathParts = urlParts.slice(uploadIndex + 2, -1);
            const filename = urlParts[urlParts.length - 1];
            const nameWithoutExt = filename.split('.')[0];

            return [...pathParts, nameWithoutExt].join('/');
        } catch (error) {
            this.logger.error(`Error extracting public_id from URL: ${url}`);
            return null;
        }
    }

    async uploadVocabularyFiles(imageFile?: Express.Multer.File, audioFile?: Express.Multer.File, oldImageUrl?: string, oldAudioUrl?: string): Promise<{ imageUrl?: string; audioUrl?: string }> {
        const results: { imageUrl?: string; audioUrl?: string } = {};

        try {
            // Upload image if provided
            if (imageFile) {
                results.imageUrl = await this.uploadVocabularyImage(imageFile, oldImageUrl);
            }

            // Upload audio if provided
            if (audioFile) {
                results.audioUrl = await this.uploadVocabularyAudio(audioFile, oldAudioUrl);
            }

            return results;
        } catch (error) {
            this.logger.error('Error uploading vocabulary files:', error);
            throw new Error('Upload files thất bại');
        }
    }
}
