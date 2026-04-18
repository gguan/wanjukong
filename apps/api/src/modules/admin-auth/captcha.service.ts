import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';

interface PendingChallenge {
  answer: string; // lowercase
  expiresAt: number; // epoch ms
}

/**
 * Local, free SVG text captcha. No external service, no API keys.
 *
 * Flow:
 *   1. Client GETs /api/admin/auth/captcha → { id, svg }.
 *   2. Server generates a random 5-char challenge, stores it in an
 *      in-memory Map keyed by a crypto-random id with a 5-minute TTL.
 *   3. Client submits { captchaId, captchaAnswer } with the login request.
 *   4. Server validates case-insensitively, deletes the entry (single-use),
 *      and proceeds with login.
 *
 * Trade-offs vs. Tencent Captcha:
 *   + No external dependency, no allowlist, no API keys.
 *   + Works identically in dev and prod.
 *   − Weaker against sophisticated OCR bots.
 *   → Acceptable because the login endpoint is already rate-limited
 *     (5/min per IP) and accounts lock out after 5 failed attempts.
 *
 * State scope: one process-local Map. On server restart all pending
 * challenges invalidate — users just reload the login page. Good enough
 * for admin login at this scale.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly pending = new Map<string, PendingChallenge>();
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly maxEntries = 10_000;

  /** Generate a new captcha challenge. Returns the lookup id + SVG markup. */
  generate(): { id: string; svg: string } {
    this.sweepExpired();

    const cap = svgCaptcha.create({
      size: 5,
      ignoreChars: '0o1il', // drop visually ambiguous chars
      noise: 3,
      color: true,
      background: '#f9fafb',
      width: 160,
      height: 50,
      fontSize: 52,
    });

    const id = crypto.randomBytes(16).toString('hex');
    this.pending.set(id, {
      answer: cap.text.toLowerCase(),
      expiresAt: Date.now() + this.ttlMs,
    });

    return { id, svg: cap.data };
  }

  /**
   * Verify a captcha answer. Always single-use — the entry is deleted on
   * both success and failure to prevent replay and to cap memory. Throws
   * on any mismatch or expiry so the controller can surface a clear error.
   */
  verify(id: string, answer: string): void {
    if (!id || !answer) {
      throw new BadRequestException('请完成验证码验证');
    }

    const entry = this.pending.get(id);
    // Consume immediately regardless of result.
    if (entry) this.pending.delete(id);

    if (!entry) {
      throw new BadRequestException('验证码已过期，请刷新重试');
    }
    if (Date.now() > entry.expiresAt) {
      throw new BadRequestException('验证码已过期，请刷新重试');
    }
    if (answer.trim().toLowerCase() !== entry.answer) {
      throw new BadRequestException('验证码错误');
    }
  }

  /** Lazy sweep on each generate() call — keeps the Map bounded without a timer. */
  private sweepExpired(): void {
    const now = Date.now();
    // Hard cap as belt-and-braces — if we ever see runaway growth, drop oldest.
    if (this.pending.size > this.maxEntries) {
      this.logger.warn(`Captcha pending cache hit max (${this.maxEntries}) — clearing`);
      this.pending.clear();
      return;
    }
    for (const [id, entry] of this.pending) {
      if (entry.expiresAt <= now) this.pending.delete(id);
    }
  }
}
