import { StringUtils } from "@/utils";

export interface GroupModerationOutcomeEmailProps {
  userName: string;
  groupTitle: string;
  action: "accepted" | "rejected";
  note?: string;
  currentYear?: number;
}

export function renderGroupModerationOutcomeEmailTemplate({
  userName,
  groupTitle,
  action,
  note,
  currentYear = new Date().getFullYear(),
}: GroupModerationOutcomeEmailProps): string {
  const safeUserName = StringUtils.escapeHtml(userName);
  const safeGroupTitle = StringUtils.escapeHtml(groupTitle);
  const safeNote = note ? StringUtils.escapeHtml(note) : undefined;

  const isApproved = action === "accepted";
  const headerBg = isApproved ? "#065F46" : "#991B1B";
  const badgeBg = isApproved ? "#D1FAE5" : "#FEE2E2";
  const badgeColor = isApproved ? "#065F46" : "#991B1B";
  const statusLabel = isApproved ? "Aprovado" : "Rejeitado";

  const title = isApproved
    ? "Seu grupo foi aprovado!"
    : "Atualização sobre seu grupo";
  const subtitle = isApproved
    ? `O grupo "${safeGroupTitle}" está ativo na plataforma`
    : `O grupo "${safeGroupTitle}" precisa de ajustes`;

  const introText = isApproved
    ? `Temos uma ótima notícia! A nossa equipe de moderação revisou e <strong>aprovou</strong> o seu grupo <strong>"${safeGroupTitle}"</strong>. O link já está ativo e disponível para os membros na Senpai.`
    : `Informamos que a nossa equipe de moderação analisou o seu grupo <strong>"${safeGroupTitle}"</strong> e ele <strong>não foi aprovado</strong> neste momento.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
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
            <td align="center" style="background-color: ${headerBg}; padding: 28px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai • Moderação
              </div>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <p style="margin:0 0 8px 0; font-size: 18px; font-weight: 700; color:#3A2E33;">
                Olá, ${safeUserName}!
              </p>
              <p style="margin:0 0 16px 0; font-size: 16px; font-weight: 600; color:#5C4C52;">
                ${subtitle}
              </p>
              <p style="margin:0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                ${introText}
              </p>
            </td>
          </tr>

          <!-- Caixa de Detalhes -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td align="left">
                          <span style="font-size: 13px; font-weight: 700; color:#3A2E33;">
                            Status da Solicitação
                          </span>
                        </td>
                        <td align="right">
                          <span style="display:inline-block; padding:3px 12px; font-size:12px; font-weight:700; border-radius:12px; background-color:${badgeBg}; color:${badgeColor};">
                            ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 4px 0; font-size: 12px; color:#8A7B80;">
                      Nome do Grupo
                    </p>
                    <p style="margin:0 0 ${safeNote ? '12px' : '0'} 0; font-size: 14px; color:#3A2E33; font-weight: 600;">
                      ${safeGroupTitle}
                    </p>

                    ${safeNote ? `
                    <div style="background-color: #FEF2F2; border-left: 3px solid #EF4444; padding: 10px 12px; border-radius: 4px; margin-top: 10px;">
                      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase;">
                        Motivo informado pela moderação
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #7F1D1D; line-height: 1.4;">
                        ${safeNote}
                      </p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${!isApproved ? `
          <!-- Orientação de Correção -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #FFF0F5; border: 1px dashed #FF3D82; border-radius: 8px; padding: 14px; text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #3A2E33;">
                  Deseja atualizar seu link?
                </p>
                <p style="margin: 0; font-size: 12px; color: #5C4C52; line-height: 1.5;">
                  Você pode abrir o aplicativo Senpai, acessar <strong>Perfil &gt; Meus grupos de WhatsApp</strong> e tocar em <strong>Editar</strong> para corrigir o convite e reenviar para moderação.
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color:#FFF0F5; padding: 20px 32px;">
              <p style="margin:0; font-size: 12px; color:#B08A96;">
                © ${currentYear} Senpai · Notificação automática de serviço
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
