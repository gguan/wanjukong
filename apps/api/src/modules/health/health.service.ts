import { Injectable } from '@nestjs/common';
import { APP_NAME } from '@wanjukong/shared';

@Injectable()
export class HealthService {
  check() {
    return {
      ok: true,
      service: `${APP_NAME}-api`,
    };
  }
}
