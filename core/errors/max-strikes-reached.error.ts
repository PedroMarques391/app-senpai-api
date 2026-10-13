import { AppError } from "./app.error";

export class MaxStrikesReachedError extends AppError {
  constructor(
    message = "Seu perfil atingiu o limite de strikes ou está restrito e não pode criar nem publicar pacotes públicos.",
  ) {
    super(message, 403, "MAX_STRIKES_REACHED");
    this.name = "MaxStrikesReachedError";
  }
}
