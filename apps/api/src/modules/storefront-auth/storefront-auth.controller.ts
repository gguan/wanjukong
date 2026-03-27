import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../admin-auth/decorators/public.decorator';
import { StorefrontAuthService } from './storefront-auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Public()
@Controller('public/auth')
export class StorefrontAuthController {
  constructor(private readonly storefrontAuthService: StorefrontAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.storefrontAuthService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto, @Req() req: Request) {
    return this.storefrontAuthService.login(dto, req.session);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.storefrontAuthService.verifyEmail(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body('email') email: string) {
    return this.storefrontAuthService.resendVerification(email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.storefrontAuthService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.storefrontAuthService.resetPassword(dto);
  }

  @Get('me')
  getMe(@Req() req: Request) {
    return this.storefrontAuthService.getMe(req.session);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return this.storefrontAuthService.logout(req.session);
  }
}
