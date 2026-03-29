export function getOrderStatusUpdateEmailHtml(params: {
  name: string | null;
  orderNo: string;
  status: string;
  orderUrl: string;
}): string {
  const { name, orderNo, status, orderUrl } = params;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
  };
  const label = statusLabels[status] || status.toLowerCase();
  const statusColors: Record<string, string> = {
    CONFIRMED: '#16a34a',
    CANCELLED: '#dc2626',
    PENDING: '#d97706',
  };
  const color = statusColors[status] || '#18181b';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Order Update</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#18181b;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">wanjukong</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:16px;color:#18181b;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:16px;color:#18181b;">Your order status has been updated.</p>
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Order</p>
          <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#18181b;">${orderNo}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">New Status</p>
          <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:${color};text-transform:capitalize;">${label}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="border-radius:6px;background-color:#18181b;">
              <a href="${orderUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Order</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
