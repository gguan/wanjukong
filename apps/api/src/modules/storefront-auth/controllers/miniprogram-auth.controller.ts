import { Controller, Post, Body, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { StorefrontAuthService } from '../storefront-auth.service';

class WechatLoginDto {
  /** Code obtained from wx.login() */
  @IsString()
  code!: string;
}

/**
 * Mini program auth endpoints.
 * Route prefix: /api/miniprogram/auth
 */
@Public()
@Controller('miniprogram/auth')
export class MiniProgramAuthController {
  constructor(private readonly authService: StorefrontAuthService) {}

  /**
   * Exchange wx.login() code for a session.
   * Auto-registers a new Customer on first login.
   */
  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto, @Req() req: Request) {
    return this.authService.wechatLogin(dto.code, req.session);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req.session);
  }
}
