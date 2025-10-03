import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

// Multer config cho hình ảnh
export const CloudinaryImageMulterConfig = {
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: 'vocabulary/images',
      resource_type: 'image',
      format: 'png',
      public_id: file.originalname.split('.')[0]
    })
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}

// Multer config cho audio
export const CloudinaryAudioMulterConfig = {
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: 'vocabulary/audio',
      resource_type: 'video', // Cloudinary treats audio as video
      format: 'mp3',
      public_id: file.originalname.split('.')[0]
    })
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file âm thanh'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}

// Multer config chung cho multiple files - sử dụng memory storage để xử lý
export const CloudinaryMultiMulterConfig = {
  storage: require('multer').memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh hoặc âm thanh'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2 // Tối đa 2 files
  }
}
