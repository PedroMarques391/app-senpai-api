import { AppError } from "./app.error";

export class PackRestrictedCannotBePublicError extends AppError {
  constructor(
    message = "Este pacote foi restrito pela moderação e precisa continuar privado. Sua conta não está restrita e você pode seguir usando o pacote normalmente.",
  ) {
    super(message, 400, "PACK_RESTRICTED_CANNOT_BE_PUBLIC");
    this.name = "PackRestrictedCannotBePublicError";
  }
}
