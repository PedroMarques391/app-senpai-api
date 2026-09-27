export interface ModerationGroupEmailTemplateProps {
  eventTitle: string;
  eventDescription: string;
  userName: string;
  userEmail: string;
  groupTitle: string;
  groupUrl: string;
}

export function renderModerationGroupEmailTemplate({
  eventTitle,
  eventDescription,
  userName,
  userEmail,
  groupTitle,
  groupUrl,
}: ModerationGroupEmailTemplateProps): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Alerta de Moderação - Grupos</title>
<style>
  body, table, td, p, a, div, span {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#FFF0F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF0F5; padding: 40px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow: 0 4px 24px rgba(255, 61, 130, 0.08);">

          <!-- Topo com marca -->
          <tr>
            <td align="center" style="background-color: #3A2E33; padding: 28px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai Moderação
              </div>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px;">
              <p style="margin:0 0 8px 0; font-size: 18px; font-weight: 700; color:#3A2E33;">
                ${eventTitle}
              </p>
              <p style="margin:0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                ${eventDescription}
              </p>
            </td>
          </tr>
          
          <!-- Detalhes do Usuário -->
          <tr>
            <td style="padding: 16px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <p style="margin:0 0 16px 0; font-size: 14px; font-weight: 700; color:#3A2E33; border-bottom: 1px solid #EAE0E3; padding-bottom: 8px;">
                      Detalhes do Usuário
                    </p>
                    <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                      Username
                    </p>
                    <p style="margin:0 0 14px 0; font-size: 14px; color:#3A2E33; font-weight: 600;">
                      ${userName}
                    </p>
                    <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                      E-mail
                    </p>
                    <p style="margin:0; font-size: 14px; color:#3A2E33; font-weight: 600;">
                      <span style="color: #FF3D82;">${userEmail}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalhes do Grupo -->
          <tr>
            <td style="padding: 8px 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF3F4; border: 1px solid #FF3D82; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <p style="margin:0 0 16px 0; font-size: 14px; font-weight: 700; color:#3A2E33; border-bottom: 1px solid #F4D5DF; padding-bottom: 8px;">
                      Detalhes do Grupo
                    </p>
                    <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                      Título
                    </p>
                    <p style="margin:0 0 16px 0; font-size: 14px; color:#3A2E33; font-weight: 600;">
                      ${groupTitle}
                    </p>
                    
                    <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                      Link do Grupo
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <a href="${groupUrl}" style="display:inline-block; padding:12px 24px; background-color:#FF3D82; color:#FFFFFF; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600; width:100%; text-align:center; box-sizing:border-box;">
                            Acessar / Analisar Grupo
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style="background-color: #F4D5DF; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #5C2A33; text-align: center;">
                            ${groupUrl}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color:#FFF0F5; padding: 20px 32px;">
              <p style="margin:0; font-size: 12px; color:#B08A96;">
                © 2026 Senpai · Alerta Interno de Moderação
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
