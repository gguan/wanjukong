import { Controller, Get, Post, Body } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { RegisterTempUploadDto } from './dto/register-temp-upload.dto';

@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('cos-sts')
  getCosSts() {
    return this.uploadsService.getTemporaryCredentials();
  }

  @Post('register-temp')
  registerTempUpload(@Body() dto: RegisterTempUploadDto) {
    return this.uploadsService.registerTempUpload(dto);
  }
}
