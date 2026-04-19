import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { SupportedLocale } from './locale.util';
import { getVerificationEmail } from './templates/customer-email-verification';
import { getPasswordResetEmail } from './templates/customer-password-reset';
import { getWelcomeEmail } from './templates/customer-welcome';
import { getOrderConfirmationEmail } from './templates/order-confirmation';
import { getOrderStatusUpdateEmail } from './templates/order-status-update';
import { getShipmentNotificationEmail } from './templates/shipment-notification';
import {
  getContactAcknowledgementEmail,
  type ContactAckParams,
} from './templates/contact-acknowledgement';
import {
  getContactForwardEmail,
  type ContactForwardParams,
} from './templates/contact-forward';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Transport strategy:
 *   1. Resend API (preferred for 海外 users — RESEND_API_KEY)
 *   2. SMTP via nodemailer (fallback, e.g. 腾讯云 SES — SMTP_HOST/SMTP_PORT)
 *   3. Console log (dev — neither configured)
 *
 * Each transactional method picks a template in the caller's locale and
 * dispatches through whichever transport is active.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private fromAddress = 'noreply@example.com';

  onModuleInit() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@example.com';

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.logger.log('Resend transport configured');
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

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
        'No email transport configured — emails will be logged to console',
      );
    }
  }

  private async dispatch(args: SendArgs): Promise<void> {
    if (this.resend) {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: args.to,
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      });
      if (error) {
        this.logger.error(`Resend send failed: ${JSON.stringify(error)}`);
        throw new Error(`Email send failed: ${error.message}`);
      }
      return;
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: args.to,
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      });
      return;
    }

    this.logger.log(`[DEV] Email to ${args.to} — ${args.subject}`);
  }

  async sendVerificationEmail(
    email: string,
    name: string | null,
    token: string,
    locale: SupportedLocale = 'en',
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Verification email for ${email} (${locale})\n  → ${verifyUrl}`,
      );
      return;
    }

    const { subject, html } = getVerificationEmail(locale, {
      name,
      verifyUrl,
    });
    await this.dispatch({ to: email, subject, html });
  }

  async sendWelcomeEmail(
    email: string,
    name: string | null,
    locale: SupportedLocale = 'en',
  ): Promise<void> {
    const siteUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Welcome email for ${email} (${locale}) — → ${siteUrl}`,
      );
      return;
    }

    const { subject, html } = getWelcomeEmail(locale, { name, siteUrl });
    await this.dispatch({ to: email, subject, html });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string | null,
    token: string,
    locale: SupportedLocale = 'en',
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Password reset email for ${email} (${locale})\n  → ${resetUrl}`,
      );
      return;
    }

    const { subject, html } = getPasswordResetEmail(locale, {
      name,
      resetUrl,
    });
    await this.dispatch({ to: email, subject, html });
  }

  async sendContactAcknowledgementEmail(
    email: string,
    locale: SupportedLocale,
    params: ContactAckParams,
  ): Promise<void> {
    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Contact ack email for ${email} (${locale}) — ${params.subject}`,
      );
      return;
    }

    const { subject, html } = getContactAcknowledgementEmail(locale, params);
    await this.dispatch({ to: email, subject, html });
  }

  async sendContactForwardEmail(
    to: string,
    params: ContactForwardParams,
  ): Promise<void> {
    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Contact forward email to ${to} — from ${params.fromEmail}: ${params.subject}`,
      );
      return;
    }

    const { subject, html } = getContactForwardEmail(params);
    await this.dispatch({
      to,
      subject,
      html,
      replyTo: params.fromEmail,
    });
  }

  async sendOrderConfirmationEmail(params: {
    email: string;
    name: string | null;
    orderNo: string;
    items: Array<{
      productNameSnapshot: string;
      variantNameSnapshot?: string | null;
      skuSnapshot?: string | null;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
    }>;
    totalPriceCents: number;
    currency: string;
    guestAccessToken?: string;
    locale?: SupportedLocale;
  }): Promise<void> {
    const locale: SupportedLocale = params.locale ?? 'en';
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const orderUrl = params.guestAccessToken
      ? `${baseUrl}/orders/${params.orderNo}?token=${params.guestAccessToken}`
      : `${baseUrl}/account/orders/${params.orderNo}`;

    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Order confirmation email for ${params.email} (${locale}) — Order ${params.orderNo}`,
      );
      return;
    }

    const { subject, html } = getOrderConfirmationEmail(locale, {
      name: params.name,
      orderNo: params.orderNo,
      items: params.items,
      totalPriceCents: params.totalPriceCents,
      currency: params.currency,
      orderUrl,
    });

    await this.dispatch({ to: params.email, subject, html });
  }

  async sendOrderStatusUpdateEmail(params: {
    email: string;
    name: string | null;
    orderNo: string;
    status: string;
    guestAccessToken?: string;
    locale?: SupportedLocale;
  }): Promise<void> {
    const locale: SupportedLocale = params.locale ?? 'en';
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const orderUrl = params.guestAccessToken
      ? `${baseUrl}/orders/${params.orderNo}?token=${params.guestAccessToken}`
      : `${baseUrl}/account/orders/${params.orderNo}`;

    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Order status update email for ${params.email} (${locale}) — Order ${params.orderNo} → ${params.status}`,
      );
      return;
    }

    const { subject, html } = getOrderStatusUpdateEmail(locale, {
      name: params.name,
      orderNo: params.orderNo,
      status: params.status,
      orderUrl,
    });

    await this.dispatch({ to: params.email, subject, html });
  }

  async sendShipmentNotificationEmail(params: {
    email: string;
    name: string | null;
    orderNo: string;
    carrierLabel: string;
    trackingNumber: string;
    trackingUrl?: string;
    locale?: SupportedLocale;
  }): Promise<void> {
    const locale: SupportedLocale = params.locale ?? 'en';
    if (!this.resend && !this.transporter) {
      this.logger.log(
        `[DEV] Shipment notification for ${params.email} (${locale}) — Order ${params.orderNo}, ` +
          `${params.carrierLabel} ${params.trackingNumber}`,
      );
      return;
    }

    const { subject, html } = getShipmentNotificationEmail(locale, {
      name: params.name,
      orderNo: params.orderNo,
      carrierLabel: params.carrierLabel,
      trackingNumber: params.trackingNumber,
      trackingUrl: params.trackingUrl,
    });

    await this.dispatch({ to: params.email, subject, html });
  }
}
