export function getPasswordResetEmailHtml(
  name: string | null,
  resetUrl: string,
): string {
  const greeting = name ? `Hi ${name},` : 'Hi,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#18181b;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#71717a;word-break:break-all;">
                ${resetUrl}
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#71717a;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
