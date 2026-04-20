import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { AppModule } from './app.module';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Normalise NODE_ENV. If an operator sets `NODE_ENV=Production` or `PROD`,
 * the string comparison above silently treats the deploy as dev mode —
 * meaning `secure: false` cookies and permissive fallbacks. Warn loudly.
 */
function assertSaneNodeEnv(): void {
  const raw = process.env.NODE_ENV;
  if (raw === undefined) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  NODE_ENV is unset. Treating as development.');
    return;
  }
  if (raw !== 'production' && raw !== 'development' && raw !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️  NODE_ENV='${raw}' is not one of production|development|test. ` +
        "Security-sensitive defaults (cookie secure flag, env-var asserts) only " +
        "apply when NODE_ENV === 'production' exactly. Double-check your deploy config.",
    );
  }
}

/**
 * Refuse to start in production if a required secret is missing.
 * Fail-closed — do not silently fall back to insecure defaults.
 */
function assertProductionSecrets(): void {
  if (!IS_PROD) return;

  const required: Array<{ name: string; why: string }> = [
    { name: 'SESSION_SECRET', why: 'signs session cookies; default would let anyone forge admin sessions' },
    { name: 'DATABASE_URL', why: 'no database, no server' },
    { name: 'CORS_ORIGIN', why: 'absence falls back to localhost which silently breaks production' },
    // Payment secrets — without these, attackers can forge payment callbacks.
    { name: 'WECHAT_PAY_API_V3_KEY', why: 'decrypts WeChat Pay notifications; absence means callbacks cannot be trusted' },
    { name: 'WECHAT_PAY_PUBLIC_KEY', why: 'verifies WeChat Pay notification signatures; absence means anyone can forge a PAID callback' },
  ];

  // PayPal provider defaults to Sandbox when PAYPAL_BASE_URL is unset. That is
  // the right default for development, but in production it means customers
  // can "pay" in sandbox for free. Only enforce when PayPal is configured.
  if (process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_SECRET) {
    required.push({
      name: 'PAYPAL_BASE_URL',
      why: 'selects PayPal environment; absence silently routes live orders to Sandbox',
    });
  }

  const missing = required.filter(({ name }) => !process.env[name]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      '\n🔒 SECURITY: Refusing to start in production without these env vars:\n' +
        missing.map((m) => `  • ${m.name} — ${m.why}`).join('\n') +
        '\n',
    );
    process.exit(1);
  }
}

/**
 * Resolve the `secure` cookie flag. Default is production-only, but can be
 * forced with COOKIE_SECURE=true (e.g. staging over HTTPS) or disabled with
 * COOKIE_SECURE=false (e.g. a dev tunnel that needs session persistence).
 * We refuse to disable secure cookies in production.
 */
function resolveCookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') {
    if (IS_PROD) {
      // eslint-disable-next-line no-console
      console.error(
        '🔒 SECURITY: COOKIE_SECURE=false is forbidden in production. Ignoring override.',
      );
      return true;
    }
    return false;
  }
  return IS_PROD;
}

async function bootstrap() {
  assertSaneNodeEnv();
  assertProductionSecrets();

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Preserve raw body for WeChat Pay signature verification
  });

  // Trust Nginx reverse proxy — required for secure cookies behind proxy.
  // Adjust via TRUST_PROXY env var if you run behind multiple layers
  // (e.g. Cloudflare → Nginx → app). Bad values here break client IP
  // detection and session cookie issuance.
  //
  // We treat empty string the same as unset. docker-compose's
  // `${TRUST_PROXY:-}` expansion forwards an empty string when the host
  // .env is missing the key, which `??` does NOT catch — and Number('')
  // is 0, which disables trust proxy entirely, which in turn makes
  // req.secure=false behind Nginx, which makes express-session drop
  // Set-Cookie for the freshly regenerated session. Default to 1.
  const trustProxyRaw = process.env.TRUST_PROXY;
  const trustProxy =
    trustProxyRaw && trustProxyRaw.trim() !== ''
      ? Number(trustProxyRaw)
      : 1;
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', Number.isFinite(trustProxy) ? trustProxy : 1);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Security headers
  app.use(helmet());

  // Server-side session with PostgreSQL store
  const PgSession = connectPgSimple(session);
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  if (!process.env.SESSION_SECRET && !IS_PROD) {
    Logger.warn(
      'SESSION_SECRET is unset; using an insecure dev default. Set this in production.',
      'Bootstrap',
    );
  }
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'session',
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true, // Extend cookie expiry on each request
      name: 'wk.sid',
      cookie: {
        httpOnly: true,
        secure: resolveCookieSecure(),
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (rolling keeps it fresh)
      },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
