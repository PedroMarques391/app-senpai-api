export interface PackSecurityWarningTemplateProps {
  ownerName: string;
  packName: string;
  reasonLabel: string;
  supportEmail: string;
  currentYear?: number;
}

export function renderPackSecurityWarningTemplate({
  ownerName,
  packName,
  reasonLabel,
  supportEmail,
  currentYear = new Date().getFullYear(),
}: PackSecurityWarningTemplateProps): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Aviso de Segurança - Pacote Ocultado</title>
<style>
  body, table, td, p, a, div, span {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F5F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F7; padding: 40px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06); border: 1px solid #E5E5EA;">

          <!-- Topo com marca -->
          <tr>
            <td align="center" style="background-color: #2C2C2E; padding: 24px;">
              <div style="font-size: 18px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai Segurança
              </div>
            </td>
          </tr>

          <!-- Corpo Principal -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin:0 0 16px 0; font-size: 16px; font-weight: 600; color:#1C1C1E;">
                Olá, ${ownerName},
              </p>
              <p style="margin:0 0 16px 0; font-size: 14px; color:#3A3A3C; line-height: 1.6;">
                Identificamos que o seu pacote de figurinhas <strong>"${packName}"</strong> recebeu denúncias da comunidade referente a:
              </p>

              <!-- Box do motivo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8F0; border-left: 4px solid #FF9500; border-radius: 4px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <span style="font-size: 14px; font-weight: 700; color:#D97706;">
                      ${reasonLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0; font-size: 14px; color:#3A3A3C; line-height: 1.6;">
                Para manter a segurança e a integridade de nossa comunidade, o pacote foi <strong>removido da visualização pública</strong> e colocado em análise de moderação.
              </p>

              <p style="margin:0 0 16px 0; font-size: 14px; color:#3A3A3C; line-height: 1.6;">
                <strong>O que isso significa?</strong>
              </p>
              <ul style="margin:0 0 20px 0; padding-left: 20px; font-size: 13px; color:#48484A; line-height: 1.6;">
                <li>O pacote continua acessível para você no aplicativo e para o seu uso pessoal.</li>
                <li>Ele não será exibido na aba Explorar nem poderá ser encontrado por outros usuários enquanto estiver em análise.</li>
                <li>Você não poderá alterá-lo para público até que a moderação conclua a revisão.</li>
              </ul>

              <p style="margin:0 0 8px 0; font-size: 14px; color:#3A3A3C; line-height: 1.6;">
                Se você considera que esta medida foi um engano ou gostaria de solicitar uma reavaliação, responda a este e-mail ou entre em contato com nosso suporte:
              </p>
              <p style="margin:0; font-size: 14px; font-weight: 600; color:#007AFF;">
                <a href="mailto:${supportEmail}" style="color:#007AFF; text-decoration:none;">${supportEmail}</a>
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color: #F2F2F7; padding: 18px 24px; border-top: 1px solid #E5E5EA; font-size: 12px; color: #8E8E93;">
              © ${currentYear} Senpai Figurinhas. Notificação automática de segurança.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
