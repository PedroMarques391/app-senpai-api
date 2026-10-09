export class EmailNotVerifiedError extends Error {
  readonly statusCode = 403;
  readonly code = "EMAIL_NOT_VERIFIED";

  constructor(
    message = "Verifique seu e-mail para criar figurinhas e packs.",
  ) {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}
