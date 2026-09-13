export interface SuccessEmailDetail {
  label: string;
  value: string;
}

export interface SuccessEmailTemplateProps {
  title: string;
  message: string;
  details?: SuccessEmailDetail[];
  noticeText?: string;
}

export function renderSuccessEmailTemplate({
  title,
  message,
  details,
  noticeText,
}: SuccessEmailTemplateProps): string {
  const detailsHtml =
    details && details.length > 0
      ? `
          <tr>
            <td style="padding: 24px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    ${details
                      .map(
                        (detail, index) => `
                    <p style="margin:0 0 6px 0; font-size: 12px; color:#8A7B80;">
                      ${detail.label}
                    </p>
                    <p style="margin:0${index < details.length - 1 ? " 0 14px 0" : ""}; font-size: 14px; color:#3A2E33; font-weight: 600;">
                      ${detail.value}
                    </p>`,
                      )
                      .join("")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : "";

  const noticeHtml = noticeText
    ? `
            <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF3F4; border-left: 3px solid #FF3D82; border-radius: 4px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin:0; font-size: 13px; color:#5C2A33; line-height: 1.5;">
                      ${noticeText}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} - Senpai</title>
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

          <!-- Imagem ilustrativa -->
          <tr>
            <td align="center" style="padding: 28px 32px 0 32px;">
              <img src="https://botdosenpai.com.br/_next/static/media/hero.0h.m393hh735_.png" alt="" width="120" style="display:block; max-width:120px; height:auto;" />
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td align="center" style="padding: 20px 32px 8px 32px;">
              <p style="margin:0 0 8px 0; font-size: 16px; font-weight: 700; color:#3A2E33;">
                ${title}
              </p>
              <p style="margin:0; font-size: 14px; color:#5C4C52; line-height: 1.6;">
                ${message}
              </p>
            </td>
          </tr>${detailsHtml}${noticeHtml}

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
