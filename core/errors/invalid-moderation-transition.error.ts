import { AppError } from "./app.error";

export class InvalidModerationTransitionError extends AppError {
  constructor(
    message = "Esta ação de moderação não é permitida para o estado atual do pacote.",
  ) {
    super(message, 409, "INVALID_MODERATION_TRANSITION");
    this.name = "InvalidModerationTransitionError";
  }
}
