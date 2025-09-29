import { ApiProperty } from '@nestjs/swagger'

export class RegisterMultipartSwaggerDTO {
  @ApiProperty({
    example: 'John Doe',
    description: 'Tên của người dùng'
  })
  name: string

  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng'
  })
  email: string

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu'
  })
  password: string

  @ApiProperty({
    example: '0986056438',
    description: 'Số điện thoại'
  })
  phoneNumber: string
}
