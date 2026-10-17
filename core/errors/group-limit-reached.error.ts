import { AppError } from "./app.error";

export class GroupLimitReachedError extends AppError {
  constructor(message = "Você já atingiu o limite de 2 grupos") {
    super(message, 400, "GROUP_LIMIT_REACHED");
    this.name = "GroupLimitReachedError";
  }
}
