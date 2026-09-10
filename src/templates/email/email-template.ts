export interface OtpEmailTemplateProps {
  otp: string;
  userName?: string;
  expiresInMinutes?: number;
}

export function renderOtpEmailTemplate({
  otp,
  userName,
  expiresInMinutes = 5,
}: OtpEmailTemplateProps): string {
  const greeting = userName ? `Olá, ${userName},` : "Olá,";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Seu código de verificação - Senpai</title>
</head>
<body style="margin:0; padding:0; background-color:#FFF0F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF0F5; padding: 40px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow: 0 4px 24px rgba(255, 61, 130, 0.08);">

          <!-- Topo com marca -->
          <tr>
            <td align="center" style="background-color: #FF3D82; padding: 28px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai
              </div>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 36px 32px 8px 32px;">
              <p style="margin:0 0 8px 0; font-size: 15px; color:#3A2E33; line-height: 1.5;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px 0; font-size: 15px; color:#3A2E33; line-height: 1.5;">
                Use o código abaixo para confirmar sua identidade no app Senpai.
              </p>
            </td>
          </tr>

          <!-- Código OTP -->
          <tr>
            <td align="center" style="padding: 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 14px;">
                <tr>
                  <td align="center" style="padding: 22px 16px;">
                    <div style="font-size: 34px; font-weight: 700; letter-spacing: 10px; color:#FF3D82; font-family: 'Courier New', Courier, monospace;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Botão "Copiar código" -->
          <tr>
            <td align="center" style="padding: 20px 32px 4px 32px;">
              <a href="#" style="display:inline-block; background-color:#FF3D82; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:700; padding: 12px 28px; border-radius: 999px;">
                📋 Copiar código
              </a>
            </td>
          </tr>

          <!-- Validade -->
          <tr>
            <td align="center" style="padding: 4px 32px 24px 32px;">
              <p style="margin:0; font-size: 13px; color:#8A7B80;">
                Este código expira em ${expiresInMinutes} minutos.
              </p>
            </td>
          </tr>

          <!-- Alerta de segurança -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF7EC; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <p style="margin:0; font-size: 13px; color:#8A5A00; line-height: 1.5;">
                      <strong>Nunca compartilhe esse código.</strong> A equipe da Senpai nunca vai pedir seu código de verificação por chamada, mensagem ou e-mail.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color:#FFF0F5; padding: 20px 32px;">
              <p style="margin:0; font-size: 12px; color:#B08A96;">
                Não foi você quem solicitou? Pode ignorar este e-mail com segurança.
              </p>
              <p style="margin:8px 0 0 0; font-size: 12px; color:#B08A96;">
                © 2026 Senpai · botdosenpai.com.br
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}