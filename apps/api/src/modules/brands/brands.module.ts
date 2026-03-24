import { Module } from '@nestjs/common';
import { BrandsAdminController } from './brands-admin.controller';
import { BrandsPublicController } from './brands-public.controller';
import { BrandsService } from './brands.service';

@Module({
  controllers: [BrandsAdminController, BrandsPublicController],
  providers: [BrandsService],
})
export class BrandsModule {}
