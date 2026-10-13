import { StringUtils } from "@/utils";

export type ModerationOutcomeType =
  | "BANNED"
  | "RELEASED"
  | "ACCOUNT_RESTRICTED"
  | "BANNED_AND_RESTRICTED";

export interface ModerationOutcomeTemplateProps {
  eventType: ModerationOutcomeType;
  userName: string;
  userHandle?: string;
  packName?: string;
  packId?: string;
  reasonLabel?: string;
  reasonDescription?: string;
  currentStrikes?: number;
  maxStrikes?: number;
  moderatorNotes?: string;
  eventDate?: string;
  supportEmail?: string;
  policyUrl?: string;
  currentYear?: number;
}

export function renderModerationOutcomeEmailTemplate(
  props: ModerationOutcomeTemplateProps,
): string {
  const {
    eventType,
    userName,
    userHandle,
    packName,
    packId,
    reasonLabel,
    reasonDescription,
    currentStrikes = 0,
    maxStrikes = 3,
    moderatorNotes,
    eventDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
    supportEmail = "contato@botdosenpai.com.br",
    policyUrl = "https://botdosenpai.com.br/termos",
    currentYear = new Date().getFullYear(),
  } = props;

  // Sanitização obrigatória contra HTML injection / XSS
  const safeUserName = StringUtils.escapeHtml(userName);
  const safeUserHandle = StringUtils.escapeHtml(userHandle);
  const safePackName = StringUtils.escapeHtml(packName);
  const safePackId = StringUtils.escapeHtml(packId);
  const safeReasonLabel = StringUtils.escapeHtml(reasonLabel);
  const safeReasonDescription = StringUtils.escapeHtml(reasonDescription);
  const safeModeratorNotes = StringUtils.escapeHtml(moderatorNotes);
  const safeSupportEmail = StringUtils.escapeHtml(supportEmail);
  const safePolicyUrl = StringUtils.escapeHtml(policyUrl);

  // Configuração textual de cabeçalho por tipo de evento
  let title = "Notificação de Moderação";
  let subtitle = "Atualização de status na plataforma";
  let introMessage = "";

  if (eventType === "BANNED") {
    title = "Notificação de Moderação";
    subtitle = `O pacote "${safePackName}" foi removido da plataforma`;
    introMessage = `Informamos que o pacote de figurinhas <strong>"${safePackName}"</strong> passou por análise da nossa equipe de moderação e foi removido em definitivo da plataforma por não estar em conformidade com as Diretrizes da Comunidade e com os Termos de Uso do Senpai.`;
  } else if (eventType === "RELEASED") {
    title = "Moderação Concluída";
    subtitle = `Seu pacote "${safePackName}" foi liberado`;
    introMessage = `A análise de moderação referente ao pacote de figurinhas <strong>"${safePackName}"</strong> foi concluída pela nossa equipe e nenhuma irregularidade foi constatada. O pacote foi liberado com sucesso e já se encontra novamente público e disponível para a comunidade na aba Explorar.`;
  } else if (eventType === "ACCOUNT_RESTRICTED") {
    title = "Aviso de Segurança de Perfil";
    subtitle = "Seu perfil atingiu o limite de strikes e está temporariamente restrito";
    introMessage = `Informamos que o seu perfil de criador atingiu o limite de ${maxStrikes} strikes decorrentes do descumprimento recorrente das Diretrizes da Comunidade do Senpai. Em decorrência desse acúmulo, seu perfil foi colocado em estado de <strong>Restrição de Criação Pública</strong>.`;
  } else if (eventType === "BANNED_AND_RESTRICTED") {
    title = "Notificação de Moderação e Restrição";
    subtitle = `Pacote "${safePackName}" removido e restrição de perfil aplicada`;
    introMessage = `Informamos que o pacote de figurinhas <strong>"${safePackName}"</strong> foi analisado e removido definitivamente da plataforma por violação das Diretrizes da Comunidade. Com a atribuição desta penalidade, seu perfil acumulou ${currentStrikes} de ${maxStrikes} strikes e entrou em estado de <strong>Restrição de Criação Pública</strong>.`;
  }

  // Bloco de Detalhes (Omitido se não houver pacote envolvido)
  const detailsHtml =
    packName || packId || reasonLabel
      ? `
      <tr>
        <td style="padding: 12px 32px 16px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border: 1px solid #F0E4E8; border-radius: 12px; padding: 16px;">
            <tr>
              <td>
                <p style="margin:0 0 12px 0; font-size: 13px; font-weight: 700; color:#3A2E33; border-bottom: 1px solid #EAE0E3; padding-bottom: 6px;">
                  Detalhes do Registro
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color:#3A2E33;">
                  ${
                    packName
                      ? `<tr>
                          <td style="padding: 4px 0; color:#8A7B80; width: 110px;">Pacote:</td>
                          <td style="padding: 4px 0; font-weight: 600;">"${safePackName}"</td>
                        </tr>`
                      : ""
                  }
                  ${
                    packId
                      ? `<tr>
                          <td style="padding: 4px 0; color:#8A7B80;">ID do Pacote:</td>
                          <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${safePackId}</td>
                        </tr>`
                      : ""
                  }
                  ${
                    reasonLabel
                      ? `<tr>
                          <td style="padding: 4px 0; color:#8A7B80;">Motivo:</td>
                          <td style="padding: 4px 0; font-weight: 600; color:#991B1B;">${safeReasonLabel}</td>
                        </tr>`
                      : ""
                  }
                  ${
                    reasonDescription
                      ? `<tr>
                          <td style="padding: 4px 0; color:#8A7B80;">Descrição:</td>
                          <td style="padding: 4px 0; color:#5C4C52;">${safeReasonDescription}</td>
                        </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding: 4px 0; color:#8A7B80;">Data:</td>
                    <td style="padding: 4px 0;">${eventDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      : "";

  // Bloco de Notas do Moderador (Omitido se não fornecido)
  const notesHtml = safeModeratorNotes
    ? `
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB; border-left: 3px solid #6B7280; border-radius: 4px; padding: 12px 16px;">
            <tr>
              <td>
                <p style="margin:0 0 4px 0; font-size: 12px; font-weight: 700; color:#4B5563;">
                  Observação da Moderação
                </p>
                <p style="margin:0; font-size: 13px; color:#1F2937; line-height: 1.5;">
                  "${safeModeratorNotes}"
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  // Bloco de Consequências Reais
  let consequenceItems: string[] = [];
  if (eventType === "BANNED") {
    consequenceItems = [
      "O pacote foi retirado permanentemente da visualização pública e da aba Explorar.",
      "O pacote não poderá ser tornado público novamente.",
      `Foi contabilizado 1 strike em seu perfil de criador (Strikes acumulados: ${currentStrikes} de ${maxStrikes}).`,
    ];
  } else if (eventType === "RELEASED") {
    consequenceItems = [
      "O pacote já está acessível publicamente e visível nas buscas e na aba Explorar.",
      "Nenhum strike foi atribuído ao seu perfil referente a esta análise cautelar.",
    ];
  } else if (eventType === "ACCOUNT_RESTRICTED") {
    consequenceItems = [
      "Você não poderá criar novos pacotes públicos na plataforma.",
      "Você não poderá alterar a visibilidade de pacotes existentes para público.",
      "O uso de figurinhas e a criação de pacotes estritamente privados (visíveis apenas para você) continuam permitidos.",
      "A restrição permanece ativa até reavaliação formal pela equipe de moderação.",
    ];
  } else if (eventType === "BANNED_AND_RESTRICTED") {
    consequenceItems = [
      "O pacote foi retirado permanentemente da visualização pública e não poderá ser republicado.",
      `Com ${currentStrikes} de ${maxStrikes} strikes atingidos, seu perfil entrou em estado de restrição de publicação pública.`,
      "Você não poderá publicar novos pacotes ou tornar públicos pacotes existentes.",
      "A criação de pacotes privados continua autorizada para seu uso pessoal.",
    ];
  }

  const consequencesHtml = `
    <tr>
      <td style="padding: 0 32px 16px 32px;">
        <p style="margin:0 0 8px 0; font-size: 14px; font-weight: 700; color:#3A2E33;">
          O que acontece a partir de agora:
        </p>
        <ul style="margin:0; padding-left: 20px; font-size: 13px; color:#48484A; line-height: 1.6;">
          ${consequenceItems.map((item) => `<li style="margin-bottom: 4px;">${item}</li>`).join("")}
        </ul>
      </td>
    </tr>`;

  // Bloco de Pedido de Desculpas (Apenas para RELEASED)
  const apologyHtml =
    eventType === "RELEASED"
      ? `
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4; border-left: 3px solid #16A34A; border-radius: 4px; padding: 12px 16px;">
            <tr>
              <td>
                <p style="margin:0; font-size: 13px; color:#14532D; line-height: 1.5;">
                  Pedimos desculpas pelo transtorno temporário decorrente do período em que o pacote permaneceu sob análise cautelar preventiva. Nosso compromisso é manter um ambiente seguro para toda a comunidade sem prejudicar criadores legítimos.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      : "";

  // Bloco "O que você pode fazer" (Orientações de contestação)
  const identifierRef = safePackId
    ? ` informando o identificador do pacote (ID: <code>${safePackId}</code>)`
    : safeUserHandle
      ? ` informando seu usuário (<code>@${safeUserHandle}</code>)`
      : "";

  const actionHtml =
    eventType !== "RELEASED"
      ? `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <p style="margin:0 0 6px 0; font-size: 14px; font-weight: 700; color:#3A2E33;">
            Como solicitar revisão ou suporte:
          </p>
          <p style="margin:0 0 8px 0; font-size: 13px; color:#48484A; line-height: 1.6;">
            Se você considera que esta medida decorreu de um equívoco e gostaria de solicitar uma reavaliação humana detalhada, responda a este e-mail ou escreva para
            <a href="mailto:${safeSupportEmail}" style="color:#FF3D82; font-weight: 600; text-decoration:none;">${safeSupportEmail}</a>${identifierRef}.
          </p>
          <p style="margin:0; font-size: 12px; color:#8A7B80; line-height: 1.5;">
            Para consultar integralmente as regras da plataforma, acesse as
            <a href="${safePolicyUrl}" target="_blank" style="color:#FF3D82; text-decoration:underline;">Diretrizes da Comunidade e Termos de Uso</a>.
          </p>
        </td>
      </tr>`
      : `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <p style="margin:0; font-size: 13px; color:#48484A; line-height: 1.6;">
            Caso tenha qualquer dúvida adicional, nossa equipe está à disposição através do e-mail
            <a href="mailto:${safeSupportEmail}" style="color:#FF3D82; font-weight: 600; text-decoration:none;">${safeSupportEmail}</a>.
          </p>
        </td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} - Senpai</title>
<style>
  body, table, td, p, a, div, span, li {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#FFF0F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF0F5; padding: 40px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow: 0 4px 24px rgba(255, 61, 130, 0.08); border: 1px solid #F0E4E8;">

          <!-- Topo Sólido Rosa Senpai -->
          <tr>
            <td align="center" style="background-color: #FF3D82; padding: 26px 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                Senpai
              </div>
            </td>
          </tr>

          <!-- Título e Introdução -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <p style="margin:0 0 6px 0; font-size: 18px; font-weight: 700; color:#3A2E33;">
                ${title}
              </p>
              <p style="margin:0 0 16px 0; font-size: 13px; font-weight: 600; color:#8A7B80;">
                ${subtitle}
              </p>
              <p style="margin:0 0 12px 0; font-size: 15px; font-weight: 600; color:#1C1C1E;">
                Olá, ${safeUserName},
              </p>
              <p style="margin:0; font-size: 14px; color:#3A3A3C; line-height: 1.6;">
                ${introMessage}
              </p>
            </td>
          </tr>

          <!-- Blocos Dinâmicos Condicionais -->
          ${detailsHtml}
          ${notesHtml}
          ${consequencesHtml}
          ${apologyHtml}
          ${actionHtml}

          <!-- Rodapé Institucional -->
          <tr>
            <td align="center" style="background-color:#FFF0F5; padding: 20px 32px; border-top: 1px solid #F0E4E8;">
              <p style="margin:0; font-size: 12px; color:#B08A96;">
                © ${currentYear} Senpai · Notificação oficial de moderação e conformidade.
              </p>
              <p style="margin:6px 0 0 0; font-size: 11px; color:#B08A96;">
                botdosenpai.com.br
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

/**
 * Gera a versão em Texto Puro (MIME text/plain) correspondente com os mesmos dados,
 * garantindo compatibilidade com clientes em modo texto e pontuação positiva em filtros anti-spam.
 */
export function renderModerationOutcomeText(
  props: ModerationOutcomeTemplateProps,
): string {
  const {
    eventType,
    userName,
    userHandle,
    packName,
    packId,
    reasonLabel,
    reasonDescription,
    currentStrikes = 0,
    maxStrikes = 3,
    moderatorNotes,
    eventDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
    supportEmail = "contato@botdosenpai.com.br",
    policyUrl = "https://botdosenpai.com.br/termos",
    currentYear = new Date().getFullYear(),
  } = props;

  const lines: string[] = [];

  lines.push("SENPAI - NOTIFICAÇÃO OFICIAL DE MODERAÇÃO");
  lines.push("========================================");
  lines.push("");
  lines.push(`Olá, ${userName},`);
  lines.push("");

  if (eventType === "BANNED") {
    lines.push(
      `Informamos que o pacote de figurinhas "${packName}" passou por análise da moderação e foi removido em definitivo da plataforma por não estar em conformidade com as Diretrizes da Comunidade e Termos de Uso do Senpai.`,
    );
  } else if (eventType === "RELEASED") {
    lines.push(
      `A análise de moderação referente ao pacote de figurinhas "${packName}" foi concluída pela nossa equipe e nenhuma irregularidade foi constatada. O pacote foi liberado com sucesso e já se encontra novamente público e disponível na aba Explorar.`,
    );
  } else if (eventType === "ACCOUNT_RESTRICTED") {
    lines.push(
      `Informamos que o seu perfil de criador atingiu o limite de ${maxStrikes} strikes por descumprimento das Diretrizes da Comunidade do Senpai. Em decorrência disso, seu perfil foi colocado em estado de Restrição de Criação Pública.`,
    );
  } else if (eventType === "BANNED_AND_RESTRICTED") {
    lines.push(
      `Informamos que o pacote de figurinhas "${packName}" foi removido definitivamente da plataforma por violação das Diretrizes da Comunidade. Com esta penalidade, seu perfil acumulou ${currentStrikes} de ${maxStrikes} strikes e entrou em estado de Restrição de Criação Pública.`,
    );
  }

  lines.push("");

  if (packName || packId || reasonLabel) {
    lines.push("DETALHES DO REGISTRO:");
    if (packName) lines.push(`- Pacote: "${packName}"`);
    if (packId) lines.push(`- ID do Pacote: ${packId}`);
    if (reasonLabel) lines.push(`- Motivo: ${reasonLabel}`);
    if (reasonDescription) lines.push(`- Descrição: ${reasonDescription}`);
    lines.push(`- Data: ${eventDate}`);
    lines.push("");
  }

  if (moderatorNotes) {
    lines.push("OBSERVAÇÃO DA MODERAÇÃO:");
    lines.push(`"${moderatorNotes}"`);
    lines.push("");
  }

  lines.push("O QUE ACONTECE A PARTIR DE AGORA:");
  if (eventType === "BANNED") {
    lines.push(
      "- O pacote foi retirado permanentemente da visualização pública.",
    );
    lines.push("- O pacote não poderá ser tornado público novamente.");
    lines.push(
      `- Foi contabilizado 1 strike em seu perfil (Strikes acumulados: ${currentStrikes} de ${maxStrikes}).`,
    );
  } else if (eventType === "RELEASED") {
    lines.push(
      "- O pacote já está acessível publicamente e visível na aba Explorar.",
    );
    lines.push(
      "- Nenhum strike foi atribuído ao seu perfil referente a esta análise cautelar.",
    );
  } else if (eventType === "ACCOUNT_RESTRICTED") {
    lines.push("- Você não poderá criar novos pacotes públicos na plataforma.");
    lines.push(
      "- Você não poderá alterar a visibilidade de pacotes existentes para público.",
    );
    lines.push(
      "- O uso de figurinhas e pacotes estritamente privados continuam permitidos.",
    );
    lines.push(
      "- A restrição permanece ativa até reavaliação formal pela moderação.",
    );
  } else if (eventType === "BANNED_AND_RESTRICTED") {
    lines.push(
      "- O pacote foi retirado permanentemente da visualização pública.",
    );
    lines.push(
      `- Com ${currentStrikes} de ${maxStrikes} strikes atingidos, seu perfil está restrito para publicação pública.`,
    );
    lines.push(
      "- Você não poderá publicar novos pacotes ou torná-los públicos.",
    );
    lines.push(
      "- A criação de pacotes privados continua autorizada para seu uso pessoal.",
    );
  }

  lines.push("");

  if (eventType === "RELEASED") {
    lines.push(
      "Pedimos desculpas pelo transtorno temporário decorrente do período em que o pacote permaneceu sob análise preventiva.",
    );
    lines.push("");
  } else {
    lines.push("COMO SOLICITAR REVISÃO OU SUPORTE:");
    lines.push(
      `Para solicitar uma reavaliação, responda a este e-mail ou escreva para ${supportEmail}${
        packId
          ? ` informando o ID do pacote (${packId})`
          : userHandle
            ? ` informando seu usuário (@${userHandle})`
            : ""
      }.`,
    );
    lines.push(`Consulte as regras em: ${policyUrl}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`© ${currentYear} Senpai · botdosenpai.com.br`);

  return lines.join("\n");
}
