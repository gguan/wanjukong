import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  // Rate limits on customer auth endpoints. The admin side already has these;
  // the storefront was falling back to the global 30 req/min, which is wide
  // enough that a naive bot can burn 1,800 attempts/hour against a single IP.
  // Tight per-endpoint ceilings close credential-stuffing, email enumeration,
  // and outbound-email spam (forgot / resend).

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.storefrontAuthService.register(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginCustomerDto, @Req() req: Request) {
    return this.storefrontAuthService.login(dto, req.session);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.storefrontAuthService.verifyEmail(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('resend-verification')
  resendVerification(
    @Body('email') email: string,
    @Body('locale') locale?: string,
  ) {
    return this.storefrontAuthService.resendVerification(email, locale);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.storefrontAuthService.forgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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
