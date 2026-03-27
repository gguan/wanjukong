import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getVerificationEmailHtml } from './templates/customer-email-verification';
import { getPasswordResetEmailHtml } from './templates/customer-password-reset';

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'noreply@example.com';

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.fromAddress = process.env.SMTP_FROM || 'noreply@example.com';

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        ...(user && pass ? { auth: { user, pass } } : {}),
      });
      this.logger.log(`SMTP transport configured (${host}:${port})`);
    } else {
      this.logger.warn(
        'SMTP not configured — emails will be logged to console',
      );
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    if (!this.transporter) {
      this.logger.log(
        `[DEV] Verification email for ${email}\n  → ${verifyUrl}`,
      );
      return;
    }

    const html = getVerificationEmailHtml(name, verifyUrl);

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (!this.transporter) {
      this.logger.log(
        `[DEV] Password reset email for ${email}\n  → ${resetUrl}`,
      );
      return;
    }

    const html = getPasswordResetEmailHtml(name, resetUrl);

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Reset your password',
      html,
    });
  }
}
