import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.brand.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateBrandDto) {
    return this.prisma.brand.create({ data: dto });
  }

  update(id: string, dto: UpdateBrandDto) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }
}
