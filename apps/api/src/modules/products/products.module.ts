import { Module } from '@nestjs/common';
import { ProductsAdminController } from './products-admin.controller';
import { ProductsPublicController } from './products-public.controller';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductVariantsService } from './product-variants.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [ProductsAdminController, ProductsPublicController],
  providers: [ProductsService, ProductImagesService, ProductVariantsService],
})
export class ProductsModule {}
