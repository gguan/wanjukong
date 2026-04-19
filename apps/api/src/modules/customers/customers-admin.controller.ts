import { Controller, Get, Param, Query } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { Roles } from '../admin-auth/decorators/roles.decorator';

@Roles(AdminRole.SUPER_ADMIN)
@Controller('admin/customers')
export class CustomersAdminController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
