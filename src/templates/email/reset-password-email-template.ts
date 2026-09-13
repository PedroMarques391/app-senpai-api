export interface ResetPasswordEmailTemplateProps {
  resetPasswordUrl: string;
  userName?: string;
  expiresInMinutes?: number;
}

export function renderResetPasswordEmailTemplate({
  resetPasswordUrl,
  userName,
  expiresInMinutes = 10,
}: ResetPasswordEmailTemplateProps): string {
  const greeting = userName ? `Olá, ${userName},` : "Olá,";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Redefinição de senha - Senpai</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800;900&display=swap');
  body, table, td, p, a, div, span {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#FFF0F5; font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

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
              <p style="margin:0 0 8px 0; font-size: 16px; font-weight: 700; color:#3A2E33; line-height: 1.5;">
                Redefinição de senha
              </p>
              <p style="margin:0 0 24px 0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta Senpai. Clique no botão abaixo para criar uma nova senha.
              </p>
            </td>
          </tr>

          <!-- Botão de ação -->
          <tr>
            <td align="center" style="padding: 4px 32px 8px 32px;">
              <a href="${resetPasswordUrl}" style="display:block; background-color:#FF3D82; color:#FFFFFF; text-decoration:none; font-size:15px; font-weight:700; padding: 15px 24px; border-radius: 10px;">
                Redefinir senha
              </a>
            </td>
          </tr>

          <!-- Validade -->
          <tr>
            <td align="center" style="padding: 12px 32px 24px 32px;">
              <p style="margin:0; font-size: 13px; color:#8A7B80;">
                Este link expira em ${expiresInMinutes} minutos e só pode ser usado uma vez.
              </p>
            </td>
          </tr>

          <!-- Link alternativo -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0; font-size: 12px; color:#FF3D82; word-break: break-all;">
                ${resetPasswordUrl}
              </p>
            </td>
          </tr>

          <!-- Aviso de segurança -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF3F4; border-left: 3px solid #FF3D82; border-radius: 4px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin:0; font-size: 13px; color:#5C2A33; line-height: 1.5;">
                      Se você não solicitou essa alteração, ignore este e-mail e sua senha atual continuará válida. Por segurança, recomendamos que você não encaminhe este e-mail a ninguém.
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
