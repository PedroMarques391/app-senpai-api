import { AppError } from "./app.error";

export class InsufficientPetalsError extends AppError {
  constructor(
    message = "Você não tem pétalas suficientes para realizar esta operação.",
  ) {
    super(message, 400, "INSUFFICIENT_PETALS");
    this.name = "InsufficientPetalsError";
  }
}
