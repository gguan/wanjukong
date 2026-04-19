import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { normalizeLocale } from '../mailer/locale.util';
import { CreateContactDto } from './dto/create-contact.dto';

interface SubmitMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async submit(dto: CreateContactDto, meta: SubmitMeta) {
    const locale = normalizeLocale(dto.locale);

    const record = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        subject: dto.subject.trim(),
        orderNumber: dto.orderNumber?.trim() || null,
        message: dto.message.trim(),
        locale,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    const supportInbox =
      process.env.CONTACT_INBOX_EMAIL || process.env.SMTP_FROM;

    // Fire-and-log both sends: storing the message is authoritative, email
    // failures shouldn't surface to the user as a submission failure.
    if (supportInbox) {
      try {
        await this.mailer.sendContactForwardEmail(supportInbox, {
          fromName: record.name,
          fromEmail: record.email,
          subject: record.subject,
          message: record.message,
          orderNumber: record.orderNumber,
          locale: record.locale,
          submittedAt: record.createdAt,
        });
      } catch (err) {
        this.logger.error(
          `Failed to forward contact message ${record.id} to support inbox`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    } else {
      this.logger.warn(
        'CONTACT_INBOX_EMAIL / SMTP_FROM not set — contact message stored but not forwarded',
      );
    }

    try {
      await this.mailer.sendContactAcknowledgementEmail(record.email, locale, {
        name: record.name,
        subject: record.subject,
        message: record.message,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send contact acknowledgement for ${record.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { received: true };
  }
}
