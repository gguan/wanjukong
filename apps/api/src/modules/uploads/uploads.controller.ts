import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UploadsService } from './uploads.service';
import { RegisterTempUploadDto } from './dto/register-temp-upload.dto';

// Gate every upload endpoint to the roles that actually manage product media.
// SessionAuthGuard (global) already requires an admin session; without an
// explicit @Roles() decorator the RolesGuard was letting any authenticated
// admin role — including narrowly-scoped future roles like BRAND_MANAGER —
// mint COS STS credentials and PUT arbitrary files into the bucket.
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('cos-sts')
  getCosSts(@Query('prefix') prefix?: string) {
    return this.uploadsService.getTemporaryCredentials(prefix);
  }

  @Post('register-temp')
  registerTempUpload(@Body() dto: RegisterTempUploadDto) {
    return this.uploadsService.registerTempUpload(dto);
  }
}
