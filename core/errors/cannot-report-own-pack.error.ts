import { AppError } from "./app.error";

export class CannotReportOwnPackError extends AppError {
  constructor(
    message = "Você não pode denunciar o seu próprio pacote de figurinhas.",
  ) {
    super(message, 400, "CANNOT_REPORT_OWN_PACK");
    this.name = "CannotReportOwnPackError";
  }
}
