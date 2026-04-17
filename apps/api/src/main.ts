import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Refuse to start in production if a required secret is missing.
 * Fail-closed — do not silently fall back to insecure defaults.
 */
function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required: Array<{ name: string; why: string }> = [
    { name: 'SESSION_SECRET', why: 'signs session cookies; default would let anyone forge admin sessions' },
    { name: 'DATABASE_URL', why: 'no database, no server' },
    { name: 'CORS_ORIGIN', why: 'absence falls back to localhost which silently breaks production' },
    // Payment secrets — without these, attackers can forge payment callbacks.
    { name: 'WECHAT_PAY_API_V3_KEY', why: 'decrypts WeChat Pay notifications; absence means callbacks cannot be trusted' },
    { name: 'WECHAT_PAY_PUBLIC_KEY', why: 'verifies WeChat Pay notification signatures; absence means anyone can forge a PAID callback' },
  ];

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

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Preserve raw body for WeChat Pay signature verification
  });

  // Trust Nginx reverse proxy — required for secure cookies behind proxy
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Security headers
  app.use(helmet());

  // Server-side session with PostgreSQL store
  const PgSession = connectPgSimple(session);
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== 'production') {
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
        secure: process.env.NODE_ENV === 'production',
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
