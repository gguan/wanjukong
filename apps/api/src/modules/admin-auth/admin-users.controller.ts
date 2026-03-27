import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import { Roles } from './decorators/roles.decorator';

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body() dto: { email: string; password: string; name: string; role: string },
  ) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    dto: { email?: string; name?: string; role?: string; isActive?: boolean },
  ) {
    return this.usersService.update(id, dto);
  }

  @Put(':id/brand-assignments')
  setBrandAssignments(
    @Param('id') id: string,
    @Body() dto: { brandIds: string[] },
  ) {
    return this.usersService.setBrandAssignments(id, dto.brandIds);
  }
}
