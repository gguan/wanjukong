import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
} from '../interfaces/payment-provider.interface';

export interface WechatPayNotificationHeaders {
  'wechatpay-signature': string;
  'wechatpay-timestamp': string;
  'wechatpay-nonce': string;
  'wechatpay-serial': string;
}

export interface WechatPayNotificationBody {
  id: string;
  event_type: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    nonce: string;
    associated_data: string;
  };
}

export interface WechatPayTransactionResult {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  payer: { openid: string };
  amount: { total: number; payer_total: number };
}

@Injectable()
export class WechatPayProvider implements IPaymentProvider {
  readonly providerName = 'WECHAT_PAY';
  private readonly logger = new Logger(WechatPayProvider.name);

  private get appId(): string {
    return process.env.WECHAT_PAY_APP_ID || '';
  }

  private get mchId(): string {
    return process.env.WECHAT_PAY_MCH_ID || '';
  }

  /** API V3 key (32-byte UTF-8 string set in WeChat Pay console) */
  private get apiV3Key(): string {
    return process.env.WECHAT_PAY_API_V3_KEY || '';
  }

  /** RSA private key (PKCS#8 PEM) */
  private get privateKey(): string {
    return (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  }

  /** Merchant certificate serial number */
  private get certSerial(): string {
    return process.env.WECHAT_PAY_CERT_SERIAL || '';
  }

  private get notifyUrl(): string {
    return (
      process.env.WECHAT_PAY_NOTIFY_URL ||
      'https://example.com/api/miniprogram/payment/wechat/notify'
    );
  }

  private get baseUrl(): string {
    return 'https://api.mch.weixin.qq.com';
  }

  // ─── Authorization Header ──────────────────────────────

  private buildAuthHeader(
    method: string,
    urlPath: string,
    body: string,
  ): string {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomBytes(16).toString('hex');

    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
    const sign = crypto
      .createSign('RSA-SHA256')
      .update(message)
      .sign(this.privateKey, 'base64');

    return (
      `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${this.mchId}",` +
      `nonce_str="${nonce}",` +
      `timestamp="${timestamp}",` +
      `serial_no="${this.certSerial}",` +
      `signature="${sign}"`
    );
  }

  // ─── Create JSAPI Order ────────────────────────────────

  /**
   * Creates a WeChat Pay JSAPI order (for mini program).
   * params.openid is required — the payer's WeChat openid.
   * amountCents is in CNY fen (1 CNY = 100 fen).
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { amountCents, outTradeNo, description, openid } = params;

    if (!openid) {
      throw new BadRequestException(
        'WeChat Pay requires payer openid',
      );
    }

    if (!this.appId || !this.mchId || !this.privateKey || !this.certSerial) {
      throw new InternalServerErrorException(
        'WeChat Pay is not configured on this server',
      );
    }

    const urlPath = '/v3/pay/transactions/jsapi';
    const reqBody = JSON.stringify({
      appid: this.appId,
      mchid: this.mchId,
      description: description || 'Wanjukong Order',
      out_trade_no: outTradeNo,
      notify_url: this.notifyUrl,
      amount: { total: amountCents, currency: 'CNY' },
      payer: { openid },
    });

    const res = await fetch(`${this.baseUrl}${urlPath}`, {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthHeader('POST', urlPath, reqBody),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: reqBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(
        `WeChat Pay create order failed: ${JSON.stringify(err)}`,
      );
    }

    const data = (await res.json()) as { prepay_id: string };
    const signParams = this.buildMiniProgramPayParams(data.prepay_id);

    return {
      providerOrderId: data.prepay_id,
      clientPayload: signParams,
    };
  }

  // ─── Mini Program Sign Params ──────────────────────────

  /**
   * Returns the params that the mini program passes to wx.requestPayment().
   */
  buildMiniProgramPayParams(prepayId: string): Record<string, string> {
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const packageStr = `prepay_id=${prepayId}`;

    const message = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = crypto
      .createSign('RSA-SHA256')
      .update(message)
      .sign(this.privateKey, 'base64');

    return {
      appId: this.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign,
    };
  }

  // ─── Notification Verification + Decryption ───────────

  /**
   * Verifies the Wechatpay-Signature header.
   * In production this should verify against the downloaded WeChat platform cert.
   * Here we verify the timestamp is recent (±5 min) as a basic replay guard.
   */
  verifyNotificationTimestamp(timestamp: string): boolean {
    const diff = Math.abs(Date.now() / 1000 - Number(timestamp));
    return diff < 300;
  }

  /**
   * Decrypts the AES-256-GCM encrypted notification resource.
   */
  decryptNotificationResource(resource: {
    ciphertext: string;
    nonce: string;
    associated_data: string;
  }): WechatPayTransactionResult {
    const key = Buffer.from(this.apiV3Key, 'utf-8'); // 32 bytes
    const iv = Buffer.from(resource.nonce, 'utf-8'); // 12 bytes
    const cipherBuf = Buffer.from(resource.ciphertext, 'base64');

    // Last 16 bytes are the auth tag
    const authTag = cipherBuf.slice(cipherBuf.length - 16);
    const cipherText = cipherBuf.slice(0, cipherBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf-8'));

    const decrypted = Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf-8')) as WechatPayTransactionResult;
  }
}
