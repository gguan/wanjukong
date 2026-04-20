import { Module } from '@nestjs/common';
import { BrandsAdminController } from './brands-admin.controller';
import { BrandsPublicController } from './brands-public.controller';
import { BrandsService } from './brands.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [BrandsAdminController, BrandsPublicController],
  providers: [BrandsService],
})
export class BrandsModule {}
