import type { WechatPayParams } from './api';

/**
 * Invoke wx.requestPayment with params from the server.
 * Returns a promise that resolves on success, rejects on failure/cancel.
 */
export function requestPayment(params: WechatPayParams): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType as 'RSA',
      paySign: params.paySign,
      success() {
        resolve();
      },
      fail(err) {
        if (err.errMsg?.includes('cancel')) {
          reject(new Error('支付已取消'));
        } else {
          reject(new Error(err.errMsg || '支付失败'));
        }
      },
    });
  });
}
