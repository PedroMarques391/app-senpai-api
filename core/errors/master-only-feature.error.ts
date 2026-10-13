import { AppError } from "./app.error";

export class MasterOnlyFeatureError extends AppError {
  constructor(
    message = "A funcionalidade de grupos é exclusiva para usuários com plano VIP Mestre.",
  ) {
    super(message, 403, "MESTRE_ONLY_FEATURE");
    this.name = "MasterOnlyFeatureError";
  }
}
