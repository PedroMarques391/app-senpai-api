import { AppError } from "./app.error";

export class ModerationActionForbiddenError extends AppError {
  constructor(
    message = "Apenas administradores podem excluir pacotes.",
  ) {
    super(message, 403, "MODERATION_ACTION_FORBIDDEN");
    this.name = "ModerationActionForbiddenError";
  }
}
