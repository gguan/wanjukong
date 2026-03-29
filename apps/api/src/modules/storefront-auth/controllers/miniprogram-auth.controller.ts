import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { CustomerSessionAuthGuard } from '../guards/customer-session-auth.guard';
import { CurrentCustomer } from '../decorators/current-customer.decorator';
import { StorefrontAuthService } from '../storefront-auth.service';

class WechatLoginDto {
  /** Code from wx.login() */
  @IsString() code!: string;
}

class BindPhoneDto {
  /** Code from getPhoneNumber button event (e.detail.code) */
  @IsString() code!: string;
}

/**
 * Mini program auth endpoints.
 * Route prefix: /api/miniprogram/auth
 */
@Controller('miniprogram/auth')
export class MiniProgramAuthController {
  constructor(private readonly authService: StorefrontAuthService) {}

  /**
   * Exchange wx.login() code for a session.
   * Auto-registers a new Customer on first login.
   */
  @Public()
  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto, @Req() req: Request) {
    return this.authService.wechatLogin(dto.code, req.session);
  }

  /**
   * Bind the logged-in user's WeChat phone number.
   *
   * Mini program side:
   *   <button open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">
   *   onGetPhone(e) { wx.request({ url: '/miniprogram/auth/bind-phone', data: { code: e.detail.code } }) }
   */
  @UseGuards(CustomerSessionAuthGuard)
  @Post('bind-phone')
  bindPhone(
    @Body() dto: BindPhoneDto,
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.authService.bindWechatPhone(customer.id, dto.code);
  }

  @Public()
  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req.session);
  }
}
