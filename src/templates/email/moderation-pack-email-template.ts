export interface ModerationPackReportTemplateProps {
  packName: string;
  packId: string;
  publisher: string;
  stickersCount: number;
  reportsCount: number;
  ownerName: string;
  ownerUsername: string;
  ownerWaId: string;
  ownerEmail?: string | null;
  reasonLabel: string;
  reasonDescription: string;
  isCritical: boolean;
  reporterUsername: string;
  reporterId: string;
  description?: string;
  reportedAtFormatted: string;
  actionTaken: string;
}

export function renderModerationPackReportTemplate({
  packName,
  packId,
  publisher,
  stickersCount,
  reportsCount,
  ownerName,
  ownerUsername,
  ownerWaId,
  ownerEmail,
  reasonLabel,
  reasonDescription,
  isCritical,
  reporterUsername,
  reporterId,
  description,
  reportedAtFormatted,
  actionTaken,
}: ModerationPackReportTemplateProps): string {
  const badgeColor = isCritical
    ? `background-color:#FEE2E2; color:#991B1B; border: 1px solid #FCA5A5;`
    : `background-color:#FEF3C7; color:#92400E; border: 1px solid #FCD34D;`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Alerta de Moderação - Pack Denunciado</title>
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

        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow: 0 4px 24px rgba(255, 61, 130, 0.08);">

          <!-- Topo com marca -->
          <tr>
            <td align="center" style="background-color: #3A2E33; padding: 26px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai Moderação
              </div>
            </td>
          </tr>

          <!-- Título e Ação -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block; padding:4px 12px; font-size:12px; font-weight:700; border-radius:12px; ${badgeColor}">
                      ${isCritical ? "CRÍTICO - TOLERÂNCIA ZERO" : "DENÚNCIA REGISTRADA"}
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px; color:#8A7B80;">${reportedAtFormatted}</span>
                  </td>
                </tr>
              </table>
              <h2 style="margin:16px 0 8px 0; font-size: 20px; font-weight: 700; color:#3A2E33;">
                Denúncia de Pacote: "${packName}"
              </h2>
              <p style="margin:0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                <strong>Ação tomada pelo sistema:</strong> ${actionTaken}
              </p>
            </td>
          </tr>

          <!-- Motivo da Denúncia -->
          <tr>
            <td style="padding: 8px 32px 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF3F4; border: 1px solid #FF3D82; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0; font-size: 12px; font-weight: 700; color:#FF3D82; text-transform: uppercase;">
                      Infração Reportada
                    </p>
                    <p style="margin:0 0 6px 0; font-size: 16px; font-weight: 700; color:#3A2E33;">
                      ${reasonLabel}
                    </p>
                    <p style="margin:0 0 10px 0; font-size: 13px; color:#5C4C52;">
                      ${reasonDescription}
                    </p>
                    ${
                      description
                        ? `<div style="background-color:#FFFFFF; border-radius:8px; padding:10px 12px; font-size:13px; color:#3A2E33; border: 1px solid #F0E4E8;">
                            <strong>Comentário do denunciante:</strong> "${description}"
                          </div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detalhes do Pacote -->
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px 0; font-size: 14px; font-weight: 700; color:#3A2E33; border-bottom: 1px solid #EAE0E3; padding-bottom: 6px;">
                      Dados do Pacote
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color:#3A2E33;">
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">ID do Pack:</td>
                        <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${packId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Publisher (Autor):</td>
                        <td style="padding: 4px 0; font-weight: 600;">${publisher}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Figurinhas no Pack:</td>
                        <td style="padding: 4px 0; font-weight: 600;">${stickersCount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Total de Denúncias:</td>
                        <td style="padding: 4px 0; font-weight: 700; color:#991B1B;">${reportsCount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detalhes do Dono do Pack -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px 0; font-size: 14px; font-weight: 700; color:#3A2E33; border-bottom: 1px solid #EAE0E3; padding-bottom: 6px;">
                      Proprietário do Pacote
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color:#3A2E33;">
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Nome:</td>
                        <td style="padding: 4px 0; font-weight: 600;">${ownerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Username:</td>
                        <td style="padding: 4px 0; font-weight: 600;">@${ownerUsername}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">WhatsApp:</td>
                        <td style="padding: 4px 0; font-weight: 600;">${ownerWaId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">E-mail:</td>
                        <td style="padding: 4px 0; font-weight: 600;">${ownerEmail ?? "Não informado"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color:#8A7B80;">Denunciado por:</td>
                        <td style="padding: 4px 0; font-weight: 600;">@${reporterUsername} (${reporterId})</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color: #FAFAFA; padding: 20px; border-top: 1px solid #F0E4E8; font-size: 12px; color: #8A7B80;">
              Você pode analisar e alterar o status deste pacote na aba de moderação do aplicativo Senpai.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
