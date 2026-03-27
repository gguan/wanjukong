import 'express-session';

declare module 'express-session' {
  interface SessionData {
    adminUserId?: string;
    adminRole?: string;
    customerId?: string;
  }
}
