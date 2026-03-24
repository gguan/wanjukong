import { Controller, Get } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('cos-sts')
  getCosSts() {
    return this.uploadsService.getTemporaryCredentials();
  }
}
