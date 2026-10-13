import { AppError } from "./app.error";

export class PackReportedCannotBePublicError extends AppError {
  constructor(
    message = "Este pacote possui denúncias pendentes ou está sob moderação e não pode ser tornado público.",
  ) {
    super(message, 400, "PACK_REPORTED_CANNOT_BE_PUBLIC");
    this.name = "PackReportedCannotBePublicError";
  }
}
