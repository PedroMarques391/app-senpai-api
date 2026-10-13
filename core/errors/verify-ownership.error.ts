import { AppError } from "./app.error";

export class VerifyOwnershipError extends AppError {
  constructor(
    message = "Operação não permitida: você não é o proprietário deste recurso",
  ) {
    super(message, 403, "VERIFY_OWNERSHIP_ERROR");
    this.name = "VerifyOwnershipError";
  }
}
