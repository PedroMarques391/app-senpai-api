import { StringUtils } from "@/utils";

export interface ReporterRewardTemplateProps {
  reporterName: string;
  packName: string;
  petalsReward: number;
  newBalance?: number;
  currentYear?: number;
}

export function renderReporterRewardEmailTemplate(
  props: ReporterRewardTemplateProps,
): string {
  const {
    reporterName,
    packName,
    petalsReward,
    newBalance,
    currentYear = new Date().getFullYear(),
  } = props;

  const safeReporterName = StringUtils.escapeHtml(reporterName);
  const safePackName = StringUtils.escapeHtml(packName);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Recompensa por Denúncia - Senpai</title>
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

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow: 0 4px 24px rgba(255, 61, 130, 0.08); border: 1px solid #FCE4EC;">

          <!-- Topo com marca -->
          <tr>
            <td align="center" style="background-color: #FF3D82; padding: 28px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai Moderação
              </div>
            </td>
          </tr>

          <!-- Corpo Principal -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin:0 0 16px 0; font-size: 16px; font-weight: 700; color:#3A2E33;">
                Olá, ${safeReporterName}! 🌸
              </p>
              <p style="margin:0 0 16px 0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                Você recentemente denunciou o pacote de figurinhas <strong>"${safePackName}"</strong>.
              </p>
              <p style="margin:0 0 20px 0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                Nossa equipe de moderação revisou o conteúdo e confirmou que ele violava as Diretrizes da Comunidade. Por isso, o pacote foi removido definitivamente da plataforma.
              </p>

              <!-- Box da Recompensa -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF5F8; border: 2px dashed #FF3D82; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="margin:0 0 4px 0; font-size: 13px; font-weight: 600; color:#8A7B80; text-transform: uppercase; letter-spacing: 0.5px;">
                      Recompensa pela sua ajuda
                    </p>
                    <p style="margin:0 0 4px 0; font-size: 28px; font-weight: 800; color:#FF3D82;">
                      +${petalsReward} Pétalas
                    </p>
                    ${
                      newBalance !== undefined
                        ? `<p style="margin:0; font-size: 12px; color:#5C4C52;">Seu novo saldo: <strong>${newBalance} pétalas</strong></p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                Seu papel em reportar conteúdos inadequados é fundamental para construirmos um espaço seguro, respeitoso e divertido para todos.
              </p>

              <p style="margin:0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                Muito obrigado por cuidar da nossa comunidade!
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color:#FFF0F5; padding: 20px 32px; border-top: 1px solid #FCE4EC;">
              <p style="margin:0; font-size: 12px; color:#B08A96;">
                © ${currentYear} Senpai Figurinhas · botdosenpai.com.br
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

export function renderReporterRewardText(
  props: ReporterRewardTemplateProps,
): string {
  const { reporterName, packName, petalsReward, newBalance } = props;

  let text = `Olá, ${reporterName}!\n\n`;
  text += `Você recentemente denunciou o pacote de figurinhas "${packName}".\n`;
  text += `Nossa equipe de moderação revisou o conteúdo e confirmou a infração. O pacote foi removido da plataforma.\n\n`;
  text += `Como agradecimento pelo seu apoio à comunidade, creditamos +${petalsReward} pétalas em sua conta!\n`;
  if (newBalance !== undefined) {
    text += `Seu novo saldo: ${newBalance} pétalas.\n`;
  }
  text += `\nObrigado por ajudar a manter o Senpai seguro e incrível!\n\n`;
  text += `Equipe Senpai`;

  return text;
}
