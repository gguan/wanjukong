interface OrderItem {
  productNameSnapshot: string;
  variantNameSnapshot?: string | null;
  skuSnapshot?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

export function getOrderConfirmationEmailHtml(params: {
  name: string | null;
  orderNo: string;
  items: OrderItem[];
  totalPriceCents: number;
  currency: string;
  orderUrl: string;
}): string {
  const { name, orderNo, items, totalPriceCents, currency, orderUrl } = params;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const symbol = currency === 'USD' ? '$' : currency + ' ';
  const fmt = (cents: number) => `${symbol}${(cents / 100).toFixed(2)}`;

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
        <span style="font-size:14px;color:#18181b;">${item.productNameSnapshot}${item.variantNameSnapshot ? ` — ${item.variantNameSnapshot}` : ''}</span>
        ${item.skuSnapshot ? `<br/><span style="font-size:12px;color:#71717a;">SKU: ${item.skuSnapshot}</span>` : ''}
      </td>
      <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;font-size:14px;color:#18181b;">
        ${item.quantity} × ${fmt(item.unitPriceCents)}
      </td>
      <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;font-size:14px;font-weight:600;color:#18181b;">
        ${fmt(item.totalPriceCents)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#18181b;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">wanjukong</p>
        </td></tr>
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0 0 8px;font-size:16px;color:#18181b;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:16px;color:#18181b;">Thank you for your order! We've received your purchase and it's being processed.</p>
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Order Number</p>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#18181b;letter-spacing:0.02em;">${orderNo}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            ${itemRows}
            <tr>
              <td colspan="2" style="padding:12px 0 0;text-align:right;font-size:14px;color:#71717a;">Total</td>
              <td style="padding:12px 0 0 16px;text-align:right;font-size:16px;font-weight:700;color:#18181b;">${fmt(totalPriceCents)}</td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="border-radius:6px;background-color:#18181b;">
              <a href="${orderUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Order</a>
            </td></tr>
          </table>
          <p style="margin:0 0 32px;font-size:14px;color:#71717a;">If you have any questions about your order, please reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
