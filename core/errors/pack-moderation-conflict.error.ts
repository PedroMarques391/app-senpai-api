import { AppError } from "./app.error";

export class PackModerationConflictError extends AppError {
  constructor(
    message = "Este pacote já foi moderado por outra pessoa. Atualize a lista para ver o estado atual.",
  ) {
    super(message, 409, "PACK_MODERATION_CONFLICT");
    this.name = "PackModerationConflictError";
  }
}
