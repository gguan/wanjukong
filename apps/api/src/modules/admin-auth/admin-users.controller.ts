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
import { BrandAssignmentsDto } from './dto/brand-assignments.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.usersService.update(id, dto);
  }

  @Put(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }

  @Put(':id/brand-assignments')
  setBrandAssignments(
    @Param('id') id: string,
    @Body() dto: BrandAssignmentsDto,
  ) {
    return this.usersService.setBrandAssignments(id, dto.brandIds);
  }
}
