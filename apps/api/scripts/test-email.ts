/**
 * Standalone transport sanity check. Exercises Resend and SMTP directly,
 * bypassing the Nest app, so you get clear per-transport error messages
 * without dealing with dispatch fallback.
 *
 * Usage:
 *   cd apps/api
 *   pnpm tsx scripts/test-email.ts <recipient-email>
 *
 * Env needed (read from apps/api/.env):
 *   RESEND_API_KEY        — Resend test
 *   RESEND_FROM           — verified sender on Resend (e.g. noreply@overrealm.shop)
 *   SMTP_HOST/PORT/USER/PASS/FROM — SMTP test (腾讯企业邮箱)
 */
import 'dotenv/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

const recipient = process.argv[2];
if (!recipient) {
  console.error('Usage: pnpm tsx scripts/test-email.ts <recipient-email>');
  process.exit(1);
}

const RESEND_FROM = process.env.RESEND_FROM || 'noreply@overrealm.shop';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@wanjukong.com';
const TIMESTAMP = new Date().toISOString();

async function testResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('⏭  Resend: RESEND_API_KEY unset, skipping');
    return;
  }
  console.log(`→ Resend: sending from ${RESEND_FROM} to ${recipient}...`);
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: recipient,
    subject: `[Resend test] ${TIMESTAMP}`,
    html: `<p>Hello from <strong>Resend</strong>.</p><p>Sent at ${TIMESTAMP}.</p>`,
  });
  if (error) {
    console.error('❌ Resend failed:', error);
    return;
  }
  console.log(`✅ Resend OK — id=${data?.id}`);
}

async function testSmtp() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (!host || !port) {
    console.log('⏭  SMTP: SMTP_HOST/PORT unset, skipping');
    return;
  }
  console.log(`→ SMTP: sending from ${SMTP_FROM} via ${host}:${port} to ${recipient}...`);
  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: recipient,
      subject: `[SMTP test] ${TIMESTAMP}`,
      html: `<p>Hello from <strong>SMTP</strong> (${host}).</p><p>Sent at ${TIMESTAMP}.</p>`,
    });
    console.log(`✅ SMTP OK — messageId=${info.messageId}`);
  } catch (err) {
    console.error('❌ SMTP failed:', err instanceof Error ? err.message : err);
  }
}

async function main() {
  console.log(`\nTesting email delivery to: ${recipient}\n`);
  await testResend();
  console.log();
  await testSmtp();
  console.log();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
