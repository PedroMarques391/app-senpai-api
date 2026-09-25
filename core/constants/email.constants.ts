export const EMAIL_SENDERS = {
  NOREPLY:
    process.env.EMAIL_FROM_NOREPLY ?? '"Senpai" <noreply@botdosenpai.com.br>',
  SECURITY:
    process.env.EMAIL_FROM_SECURITY ??
    '"Senpai Segurança" <seguranca@botdosenpai.com.br>',
  SUPPORT:
    process.env.EMAIL_FROM_SUPPORT ??
    '"Senpai Suporte" <contato@botdosenpai.com.br>',
} as const;

export const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO ?? "botdosenpaicontato@gmail.com";
