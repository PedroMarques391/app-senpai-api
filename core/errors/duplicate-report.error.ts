import { AppError } from "./app.error";

export class DuplicateReportError extends AppError {
  constructor(
    message = "Você já enviou uma denúncia para este pacote anteriormente.",
  ) {
    super(message, 409, "DUPLICATE_REPORT");
    this.name = "DuplicateReportError";
  }
}
