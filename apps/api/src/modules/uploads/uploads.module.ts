import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadCleanupService } from './upload-cleanup.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, UploadCleanupService],
  exports: [UploadsService],
})
export class UploadsModule {}
