import { Module } from '@nestjs/common';
import { CategoriesAdminController } from './categories-admin.controller';
import { CategoriesPublicController } from './categories-public.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesAdminController, CategoriesPublicController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
