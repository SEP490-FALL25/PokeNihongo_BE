import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

export const CloudinaryMulterConfig = {
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: 'uploads', // Tạo thư mục trong Cloudinary
      format: 'png', // Định dạng ảnh (có thể là jpg, png, webp)
      public_id: file.originalname.split('.')[0] // Đặt tên file upload
    })
  })
}
