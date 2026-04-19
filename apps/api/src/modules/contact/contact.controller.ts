import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../admin-auth/decorators/public.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Public()
@Controller('public/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Public contact form submission. Rate-limited per-IP to slow down abuse;
   * the global throttler also applies on top of this.
   */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  submit(@Body() dto: CreateContactDto, @Req() req: Request) {
    return this.contactService.submit(dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
