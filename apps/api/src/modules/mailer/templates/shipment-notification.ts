export function getShipmentNotificationEmailHtml(params: {
  name: string | null;
  orderNo: string;
  carrierLabel: string;
  trackingNumber: string;
  trackingUrl?: string;
}): string {
  const greeting = params.name ? `Hi ${params.name},` : 'Hi,';
  const trackingLink = params.trackingUrl
    ? `<a href="${params.trackingUrl}" style="color: #008060; text-decoration: underline;">${params.trackingNumber}</a>`
    : `<strong>${params.trackingNumber}</strong>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e3e3e3;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:20px 24px;">
            <span style="color:#fff;font-size:16px;font-weight:600;">wanjukong</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#303030;">${greeting}</p>
            <p style="margin:0 0 24px;font-size:15px;color:#303030;">
              Great news! Your order <strong>${params.orderNo}</strong> has been shipped.
            </p>

            <!-- Tracking Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px;font-size:12px;color:#8c9196;text-transform:uppercase;letter-spacing:0.04em;">Carrier</p>
                  <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#303030;">${params.carrierLabel}</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#8c9196;text-transform:uppercase;letter-spacing:0.04em;">Tracking Number</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#303030;">${trackingLink}</p>
                </td>
              </tr>
            </table>

            ${params.trackingUrl ? `
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#303030;border-radius:6px;padding:10px 24px;">
                  <a href="${params.trackingUrl}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:500;">Track Your Package</a>
                </td>
              </tr>
            </table>
            ` : ''}

            <p style="margin:0;font-size:13px;color:#8c9196;">
              If you have any questions, please reply to this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e3e3e3;">
            <p style="margin:0;font-size:12px;color:#8c9196;text-align:center;">
              &copy; wanjukong. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
