import { Controller, Logger } from '@nestjs/common'

@Controller()
export class RabbitmqController {
  private readonly logger = new Logger(RabbitmqController.name)
  // constructor(private readonly poolTableConsumer: PoolTableConsumer) { }

  // @EventPattern('pooltable.upload_qrcode')
  // async handleUploadQRCode(data: { id: string }) {
  //     await this.poolTableConsumer.handleUploadQrCode(data);
  // }
}
