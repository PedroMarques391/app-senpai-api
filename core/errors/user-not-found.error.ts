import { AppError } from "./app.error";

export class UserNotFoundError extends AppError {
  constructor(message = "Usuário não encontrado") {
    super(message, 404, "USER_NOT_FOUND");
    this.name = "UserNotFoundError";
  }
}
