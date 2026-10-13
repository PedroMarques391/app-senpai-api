import { AppError } from "./app.error";

export class EmailNotVerifiedError extends AppError {
  constructor(
    message = "Verifique seu e-mail para criar figurinhas e packs.",
  ) {
    super(message, 403, "EMAIL_NOT_VERIFIED");
    this.name = "EmailNotVerifiedError";
  }
}
