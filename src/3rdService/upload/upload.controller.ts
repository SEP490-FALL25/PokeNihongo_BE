// import { Controller, Post, UploadedFile, UseInterceptors, Inject } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { UploadService } from './upload.service';
// import { ApiBearerAuth } from '@nestjs/swagger';

// @Controller('upload')
// @ApiBearerAuth('access-token')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

//   @Post()
//   @UseInterceptors(FileInterceptor('file'))
//   async uploadFile(@UploadedFile() file: Express.Multer.File) {
//     return this.uploadService.uploadFile(file);
//   }
// }
